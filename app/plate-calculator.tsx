import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Chip, ErrorState, IconButton, Screen, Text } from '../src/components/ui';
import {
  calculatePlateLoadout,
  defaultBarbellWeights,
  getDefaultPlateInventory,
} from '../src/domain/plateCalculator';
import type { UnitSystem } from '../src/domain/types';
import { colors, radii, spacing } from '../src/design/tokens';

interface PlateRow {
  id: string;
  weight: string;
  count: string;
}

export default function PlateCalculatorScreen() {
  const params = useLocalSearchParams<{ initialLoad?: string; unitSystem?: string }>();
  const initialUnit: UnitSystem = params.unitSystem === 'metric' ? 'metric' : 'imperial';
  const initialLoad = isPositiveNumber(params.initialLoad)
    ? params.initialLoad!
    : initialUnit === 'imperial'
      ? '185'
      : '80';
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialUnit);
  const [targetLoad, setTargetLoad] = useState(initialLoad);
  const [barbellLoad, setBarbellLoad] = useState(String(defaultBarbellWeights[initialUnit]));
  const [plateRows, setPlateRows] = useState<PlateRow[]>(() =>
    getDefaultPlateInventory(initialUnit).map((plate, index) => ({
      id: `plate-${index + 1}`,
      weight: formatInput(plate.weight),
      count: formatInput(plate.count),
    })),
  );

  const calculation = useMemo(
    () =>
      calculatePlateLoadout({
        targetLoad: parseInput(targetLoad),
        barbellLoad: parseInput(barbellLoad),
        availablePlates: plateRows.map((row) => ({
          weight: parseInput(row.weight),
          count: parseInput(row.count),
        })),
      }),
    [barbellLoad, plateRows, targetLoad],
  );
  const unitLabel = unitSystem === 'imperial' ? 'lb' : 'kg';

  const switchUnit = (nextUnit: UnitSystem) => {
    if (nextUnit === unitSystem) return;
    setUnitSystem(nextUnit);
    setBarbellLoad(String(defaultBarbellWeights[nextUnit]));
    setPlateRows(
      getDefaultPlateInventory(nextUnit).map((plate, index) => ({
        id: `plate-${Date.now()}-${index}`,
        weight: formatInput(plate.weight),
        count: formatInput(plate.count),
      })),
    );
  };

  const updatePlateRow = (id: string, field: 'weight' | 'count', value: string) => {
    setPlateRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <View style={styles.header}>
          <IconButton
            icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
            label="Back to workout"
            onPress={() => router.back()}
          />
          <Text variant="caption" tone="muted">
            BARBELL UTILITY
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text variant="display" accessibilityRole="header" style={styles.title}>
          Load the bar.
        </Text>
        <Text variant="body" tone="muted" style={styles.subtitle}>
          Set the total target, bar weight, and plates you actually have. SHIFT6 only recommends
          matching plates and never rounds above your target.
        </Text>

        <View style={styles.unitRow} accessibilityLabel="Plate calculator unit system">
          <Chip
            label="Imperial · lb"
            selected={unitSystem === 'imperial'}
            onPress={() => switchUnit('imperial')}
          />
          <Chip
            label="Metric · kg"
            selected={unitSystem === 'metric'}
            onPress={() => switchUnit('metric')}
          />
        </View>

        <Card tone="lavender" style={styles.inputCard} accessibilityLabel="Load inputs">
          <Text variant="smallMedium">Load inputs</Text>
          <Text variant="small" tone="muted" style={styles.cardHint}>
            Total load includes the barbell.
          </Text>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text variant="caption" tone="muted">
                TARGET ({unitLabel})
              </Text>
              <TextInput
                accessibilityLabel={`Target total load in ${unitLabel}`}
                keyboardType="decimal-pad"
                onChangeText={setTargetLoad}
                placeholder={unitSystem === 'imperial' ? '185' : '80'}
                placeholderTextColor={colors.inkMuted}
                style={styles.loadInput}
                value={targetLoad}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text variant="caption" tone="muted">
                BAR ({unitLabel})
              </Text>
              <TextInput
                accessibilityLabel={`Barbell weight in ${unitLabel}`}
                keyboardType="decimal-pad"
                onChangeText={setBarbellLoad}
                style={styles.loadInput}
                value={barbellLoad}
              />
            </View>
          </View>
        </Card>

        <Card tone="white" style={styles.plateCard} accessibilityLabel="Available plate inventory">
          <View style={styles.cardHeader}>
            <View style={styles.cardCopy}>
              <Text variant="smallMedium">Available plates</Text>
              <Text variant="small" tone="muted" style={styles.cardHint}>
                Counts are total plates. SHIFT6 loads them in pairs.
              </Text>
            </View>
            <Chip label={`${unitLabel}`} selected />
          </View>
          <View style={styles.inventoryHeader}>
            <Text variant="caption" tone="muted" style={styles.weightHeader}>
              SIZE ({unitLabel})
            </Text>
            <Text variant="caption" tone="muted" style={styles.countHeader}>
              TOTAL PLATES
            </Text>
          </View>
          {plateRows.map((row, index) => (
            <View key={row.id} style={styles.plateRow}>
              <TextInput
                accessibilityLabel={`Plate ${index + 1} size in ${unitLabel}`}
                keyboardType="decimal-pad"
                onChangeText={(value) => updatePlateRow(row.id, 'weight', value)}
                style={styles.inventoryInput}
                value={row.weight}
              />
              <TextInput
                accessibilityLabel={`Plate ${index + 1} total count`}
                keyboardType="number-pad"
                onChangeText={(value) => updatePlateRow(row.id, 'count', value)}
                style={styles.inventoryInput}
                value={row.count}
              />
              <IconButton
                icon={<Ionicons name="close" size={18} color={colors.ink} />}
                label={`Remove plate size ${row.weight} ${unitLabel}`}
                onPress={() =>
                  setPlateRows((current) => current.filter((plate) => plate.id !== row.id))
                }
              />
            </View>
          ))}
          <Button
            label="Add plate size"
            variant="ghost"
            icon={<Ionicons name="add" size={18} color={colors.ink} />}
            onPress={() =>
              setPlateRows((current) => [
                ...current,
                { id: `plate-${Date.now()}`, weight: '1', count: '2' },
              ])
            }
            style={styles.addButton}
          />
        </Card>

        {calculation.status === 'invalid' ? (
          <ErrorState message={calculation.message} />
        ) : (
          <Card
            tone={calculation.status === 'exact' ? 'mint' : 'yellow'}
            style={styles.resultCard}
            accessibilityLabel={`Plate result: ${formatInput(calculation.achievableLoad)} ${unitLabel}. ${calculation.message}`}
          >
            <Text variant="caption" tone="muted">
              {calculation.status === 'exact' ? 'EXACT LOADING' : 'CLOSEST SAFE LOADING'}
            </Text>
            <Text variant="h1" style={styles.resultTitle}>
              {formatInput(calculation.achievableLoad)} {unitLabel}
            </Text>
            <Text variant="small" tone="muted">
              {calculation.message}
            </Text>
            <View style={styles.loadout}>
              <Text variant="smallMedium">Each side</Text>
              {calculation.perSide.length > 0 ? (
                calculation.perSide.map((plate) => (
                  <Text
                    key={plate.weight}
                    variant="body"
                    accessibilityLabel={`${plate.weight} ${unitLabel}, ${plate.pairCount} on each side`}
                  >
                    {formatInput(plate.weight)} {unitLabel} × {plate.pairCount}
                  </Text>
                ))
              ) : (
                <Text variant="body" tone="muted">
                  No plates
                </Text>
              )}
            </View>
          </Card>
        )}

        <Text variant="caption" tone="muted" style={styles.footerNote}>
          Check the collars, bar rating, and gym rules before lifting. This utility is a loading
          aid, not a substitute for safe setup.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function parseInput(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

function formatInput(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '');
}

function isPositiveNumber(value: string | undefined): boolean {
  return value !== undefined && Number.isFinite(Number(value)) && Number(value) > 0;
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    marginTop: spacing.xxxl,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  inputCard: {
    marginTop: spacing.xl,
  },
  cardHint: {
    marginTop: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  inputGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  loadInput: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 20,
  },
  plateCard: {
    marginTop: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardCopy: {
    flex: 1,
  },
  inventoryHeader: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  weightHeader: {
    flex: 1,
  },
  countHeader: {
    flex: 1,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  inventoryInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.ink,
    fontSize: 16,
  },
  addButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 0,
  },
  resultCard: {
    marginTop: spacing.lg,
  },
  resultTitle: {
    marginTop: spacing.xs,
  },
  loadout: {
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerNote: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
});
