package com.shift6.qa.a11yprobe;

import android.accessibilityservice.AccessibilityServiceInfo;
import android.app.Activity;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityWindowInfo;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.List;

/** QA-only observer: never performs node actions, injects events or modifies system settings. */
public final class Probe extends Instrumentation {
    private static final int MAX_NODES = 5000, MAX_DEPTH = 128, MAX_WINDOWS = 32;
    private static final int MAX_STRING = 2048, MAX_ACTIONS = 64;
    private static final int MAX_TOTAL_STRING_CHARS = 1000000;
    private static final long MAX_MILLIS = 10000;
    private final JSONArray limitations = new JSONArray();
    private int nodes;
    private int stringChars;
    private long deadline;
    private Bundle arguments;

    @Override public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        this.arguments = arguments == null ? new Bundle() : new Bundle(arguments);
        start();
    }

    @Override public void onStart() {
        Bundle result = new Bundle();
        JSONObject report = new JSONObject();
        try {
            int holdConnectedMs = 0;
            if (arguments.containsKey("holdConnectedMs")) {
                Object requested = arguments.get("holdConnectedMs");
                if (!(requested instanceof String) || !((String) requested).matches("0|[1-9][0-9]{0,3}"))
                    throw new IllegalArgumentException();
                holdConnectedMs = Integer.parseInt((String) requested);
                if (holdConnectedMs > 5000) throw new IllegalArgumentException();
            }
            report.put("formatVersion", 1);
            report.put("holdConnectedMs", holdConnectedMs);
            report.put("observerConnected", false);
            report.put("capturedAtEpochMillis", System.currentTimeMillis());
            JSONObject platform = new JSONObject();
            platform.put("sdk", Build.VERSION.SDK_INT);
            platform.put("release", value(Build.VERSION.RELEASE));
            platform.put("manufacturer", value(Build.MANUFACTURER));
            platform.put("model", value(Build.MODEL));
            platform.put("fingerprint", value(Build.FINGERPRINT));
            platform.put("probePackage", getContext().getPackageName());
            platform.put("automationFlags", UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
            report.put("platform", platform);
            JSONObject limits = new JSONObject();
            limits.put("nodes", MAX_NODES); limits.put("depth", MAX_DEPTH);
            limits.put("windows", MAX_WINDOWS); limits.put("stringChars", MAX_STRING);
            limits.put("actionsPerNode", MAX_ACTIONS); limits.put("traversalMillis", MAX_MILLIS);
            limits.put("totalStringChars", MAX_TOTAL_STRING_CHARS);
            report.put("limits", limits);

            UiAutomation automation = getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
            if (automation == null) throw new IllegalStateException();
            AccessibilityServiceInfo info = automation.getServiceInfo();
            if (info == null) throw new IllegalStateException();
            info.flags |= AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
                    | AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS;
            automation.setServiceInfo(info); // Only this temporary observer's retrieval flags.
            report.put("observerConnected", true);
            Bundle connected = new Bundle();
            connected.putBoolean("observerConnected", true);
            connected.putString("status", "observer_connected");
            connected.putInt("holdConnectedMs", holdConnectedMs);
            connected.putInt("automationFlags", UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
            sendStatus(1, connected);
            long holdStarted = SystemClock.uptimeMillis();
            if (holdConnectedMs > 0) SystemClock.sleep(holdConnectedMs);
            report.put("heldConnectedMs", SystemClock.uptimeMillis() - holdStarted);
            report.put("capturedAtEpochMillis", System.currentTimeMillis());
            deadline = SystemClock.uptimeMillis() + MAX_MILLIS;

            AccessibilityNodeInfo active = automation.getRootInActiveWindow();
            if (active == null) throw new IllegalStateException();
            JSONArray activeNodes = new JSONArray();
            try {
                if (!active.refresh()) limit("activeRootRefreshFailed");
                report.put("activeWindowId", active.getWindowId());
                walk(active, -1, 0, activeNodes);
            } finally { active.recycle(); }
            report.put("activeWindowNodes", activeNodes);
            JSONArray windows = new JSONArray();
            List<AccessibilityWindowInfo> available = automation.getWindows();
            if (available == null || available.isEmpty()) limit("interactiveWindowsUnavailable");
            if (available != null) {
                try {
                    for (int i = 0; i < available.size(); i++) {
                        if (i >= MAX_WINDOWS || expired()) { limit("windowsTruncated"); break; }
                        AccessibilityWindowInfo window = available.get(i);
                        JSONObject entry = new JSONObject();
                        entry.put("id", window.getId()); entry.put("type", window.getType());
                        entry.put("layer", window.getLayer()); entry.put("title", value(window.getTitle()));
                        entry.put("active", window.isActive()); entry.put("inputFocused", window.isFocused());
                        entry.put("accessibilityFocused", window.isAccessibilityFocused());
                        Rect bounds = new Rect(); window.getBoundsInScreen(bounds);
                        entry.put("bounds", rect(bounds));
                        JSONArray children = new JSONArray();
                        AccessibilityNodeInfo root = window.getRoot();
                        if (root == null) { entry.put("rootUnavailable", true); limit("windowRootUnavailable"); }
                        else try { walk(root, -1, 0, children); } finally { root.recycle(); }
                        entry.put("nodes", children); windows.put(entry);
                    }
                } finally { for (AccessibilityWindowInfo window : available) window.recycle(); }
            }
            report.put("windows", windows);
            report.put("nodeCount", nodes);
            report.put("limitations", limitations);
            report.put("complete", limitations.length() == 0);
            report.put("success", true);
            report.put("snapshotSemantics", "Sequential live reads; not an atomic app snapshot. Completeness is bounded to exposed accessibility trees.");
            write(report);
            result.putBoolean("success", true);
            result.putBoolean("observerConnected", true);
            result.putBoolean("complete", limitations.length() == 0);
            result.putInt("nodeCount", nodes);
            result.putString("cacheFile", "cache/a11y-snapshot.json");
            result.putString("status", limitations.length() == 0 ? "captured" : "captured_with_limitations");
            sendStatus(0, result);
            finish(Activity.RESULT_OK, result);
        } catch (Exception error) {
            try {
                report.put("success", false); report.put("complete", false);
                report.put("errorClass", error.getClass().getSimpleName());
                report.put("limitations", limitations); write(report);
            } catch (Exception ignored) { /* Final status still reports failure. */ }
            result.putBoolean("success", false); result.putBoolean("complete", false);
            result.putString("status", "failed");
            result.putString("errorClass", error.getClass().getSimpleName());
            sendStatus(-1, result); finish(Activity.RESULT_CANCELED, result);
        }
    }

    private void walk(AccessibilityNodeInfo node, int parent, int depth, JSONArray output) throws Exception {
        if (nodes >= MAX_NODES) { limit("nodeLimit"); return; }
        if (depth > MAX_DEPTH) { limit("depthLimit"); return; }
        if (expired()) { limit("traversalTimeLimit"); return; }
        int id = nodes++;
        JSONObject entry = new JSONObject();
        entry.put("id", id); entry.put("parent", parent); entry.put("depth", depth);
        entry.put("windowId", node.getWindowId());
        entry.put("package", value(node.getPackageName())); entry.put("text", value(node.getText()));
        entry.put("contentDescription", value(node.getContentDescription()));
        entry.put("viewId", value(node.getViewIdResourceName())); entry.put("class", value(node.getClassName()));
        entry.put("visible", node.isVisibleToUser()); entry.put("enabled", node.isEnabled());
        entry.put("editable", node.isEditable()); entry.put("inputFocused", node.isFocused());
        entry.put("accessibilityFocused", node.isAccessibilityFocused());
        entry.put("focusable", node.isFocusable()); entry.put("clickable", node.isClickable());
        entry.put("scrollable", node.isScrollable()); entry.put("password", node.isPassword());
        Rect bounds = new Rect(); node.getBoundsInScreen(bounds); entry.put("bounds", rect(bounds));
        JSONArray actions = new JSONArray();
        List<AccessibilityNodeInfo.AccessibilityAction> available = node.getActionList();
        for (int i = 0; i < available.size(); i++) {
            if (i >= MAX_ACTIONS) { limit("actionLimit"); break; }
            JSONObject action = new JSONObject(); action.put("id", available.get(i).getId());
            action.put("label", value(available.get(i).getLabel())); actions.put(action);
        }
        entry.put("actions", actions); entry.put("reportedChildCount", node.getChildCount());
        output.put(entry);
        for (int i = 0; i < node.getChildCount(); i++) {
            if (nodes >= MAX_NODES || expired()) { limit("childrenTruncated"); break; }
            AccessibilityNodeInfo child = node.getChild(i);
            if (child == null) { limit("childUnavailable"); continue; }
            try { walk(child, id, depth + 1, output); } finally { child.recycle(); }
        }
    }
    private boolean expired() { return SystemClock.uptimeMillis() >= deadline; }
    private void limit(String reason) {
        for (int i = 0; i < limitations.length(); i++) if (reason.equals(limitations.optString(i))) return;
        limitations.put(reason);
    }
    private Object value(CharSequence source) {
        if (source == null) return JSONObject.NULL;
        int length = Math.min(source.length(), MAX_STRING);
        if (source.length() > MAX_STRING) limit("stringLimit");
        int remaining = MAX_TOTAL_STRING_CHARS - stringChars;
        if (length > remaining) { limit("totalStringLimit"); length = remaining; }
        stringChars += length;
        return source.subSequence(0, length).toString();
    }
    private JSONArray rect(Rect bounds) {
        return new JSONArray().put(bounds.left).put(bounds.top).put(bounds.right).put(bounds.bottom);
    }
    private void write(JSONObject report) throws Exception {
        File cache = getContext().getCacheDir();
        File temporary = new File(cache, "a11y-snapshot.tmp");
        Files.write(temporary.toPath(), report.toString(2).getBytes(StandardCharsets.UTF_8));
        Files.move(temporary.toPath(), new File(cache, "a11y-snapshot.json").toPath(), StandardCopyOption.REPLACE_EXISTING);
    }
}
