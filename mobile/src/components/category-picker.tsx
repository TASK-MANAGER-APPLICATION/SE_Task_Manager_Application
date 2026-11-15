import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Category } from '../services/api';

type CategoryPickerProps = {
  categories: Category[];
  categoryId: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
};

export function CategoryPicker({
  categories,
  categoryId,
  onChange,
  disabled = false,
}: CategoryPickerProps) {
  const options = [
    { id: '', name: 'Uncategorized' },
    ...categories.map((category) => ({
      id: String(category.id),
      name: category.name === 'Uncategorized'
        ? 'Uncategorized category'
        : category.name,
    })),
  ];

  return (
    <View style={styles.options}>
      {options.map((option) => {
        const selected = categoryId === option.id;
        return (
          <Pressable
            key={option.id || 'none'}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => onChange(option.id)}
            disabled={disabled}
          >
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
              {option.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE1ED',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionSelected: { backgroundColor: '#5968D8', borderColor: '#5968D8' },
  optionText: { color: '#414966', fontWeight: '600' },
  optionTextSelected: { color: '#FFFFFF' },
});
