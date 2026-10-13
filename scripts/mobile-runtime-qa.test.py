"""Offline contract checks; these are not native iOS runtime evidence."""
import ast
import datetime
from pathlib import Path
import re
import unittest
from unittest.mock import Mock
import xml.etree.ElementTree as ET

SCRIPT = Path(__file__).with_name('mobile-runtime-qa.py')
TREE = ast.parse(SCRIPT.read_text(encoding='utf-8'))
MESSAGE = ('Start date 2026-10-13 · America/Toronto. '
           'This saves the six-week calendar for your current private plan. '
           'Any current active cycle will be paused; its history stays unchanged.')


def hierarchy(title='Start this six-week cycle?', message=MESSAGE, confirm='Start cycle', alert=True):
    root = ET.Element('AppiumAUT')
    dialog = ET.SubElement(root, 'XCUIElementTypeAlert' if alert else 'XCUIElementTypeOther')
    for label in (title, message, 'Cancel', confirm):
        ET.SubElement(dialog, 'XCUIElementTypeStaticText', {'label': label})
    return ET.tostring(root, encoding='unicode')


class PrivateStartConfirmationTests(unittest.TestCase):
    def setUp(self):
        self.env = {'datetime': datetime, 're': re, 'ET': ET, 'RESULT': {},
                    'expect': Mock(), 'snapshot': Mock(return_value=hierarchy()), 'click': Mock()}
        definition = next(node for node in TREE.body
                          if isinstance(node, ast.FunctionDef) and node.name == 'confirm_private_cycle_start')
        exec(compile(ast.Module(body=[definition], type_ignores=[]), str(SCRIPT), 'exec'), self.env)

    def confirm(self):
        self.env['confirm_private_cycle_start']()

    def test_known_native_alert_records_reviewed_binding_before_exact_confirmation(self):
        self.confirm()
        self.env['click'].assert_called_once_with('Start cycle')
        self.assertEqual(self.env['RESULT']['privateCycleStartPreview'],
                         {'date': '2026-10-13', 'timeZone': 'America/Toronto'})
        self.env['snapshot'].assert_called_once_with('private-cycle-date-timezone-confirmation')

    def test_unknown_or_incomplete_dialog_never_clicked(self):
        for tree in (hierarchy(title='Delete local data?'), hierarchy(confirm='Continue'),
                     hierarchy(message='Start immediately'), hierarchy(alert=False),
                     hierarchy(message=MESSAGE.replace('2026-10-13', '2026-02-30'))):
            with self.subTest(tree=tree):
                self.env['snapshot'].return_value = tree
                with self.assertRaises((AssertionError, ValueError)):
                    self.confirm()
                self.env['click'].assert_not_called()

    def test_unexpected_second_alert_never_clicked(self):
        root = ET.fromstring(hierarchy())
        root.append(ET.fromstring(hierarchy())[0])
        self.env['snapshot'].return_value = ET.tostring(root, encoding='unicode')
        with self.assertRaises(AssertionError):
            self.confirm()
        self.env['click'].assert_not_called()

    def test_journey_requires_private_confirmation_before_home_and_uses_imperial_label(self):
        journey = next(node for node in TREE.body
                       if isinstance(node, ast.FunctionDef) and node.name == 'journey')
        calls = [(statement.value.func.id,
                  statement.value.args[0].value if statement.value.args else None)
                 for statement in journey.body if isinstance(statement, ast.Expr)
                 and isinstance(statement.value, ast.Call)
                 and isinstance(statement.value.func, ast.Name)
                 and (not statement.value.args or isinstance(statement.value.args[0], ast.Constant))]
        index = calls.index(('click', 'Start this six-week cycle'))
        self.assertEqual(calls[index:index + 3], [('click', 'Start this six-week cycle'),
                         ('confirm_private_cycle_start', None), ('expect', 'Start workout')])
        self.assertIn(('click', 'Load for a fixed rep count (lb)'), calls)
        self.assertNotIn(('click', 'Load for a fixed rep count (kg)'), calls)


if __name__ == '__main__':
    unittest.main()
