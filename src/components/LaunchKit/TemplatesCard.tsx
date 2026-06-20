import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Colors from '../../constants/colors';

export const TemplatesCard: React.FC = () => {
  const handleDownload = (templateName: string) => {
    Alert.alert('Coming Soon', `The import portal for ${templateName} will be available in a later phase.`);
  };

  const templates = [
    { name: 'Routes.xlsx', icon: '🛣️' },
    { name: 'Stops.xlsx', icon: '🚏' },
    { name: 'Drivers.xlsx', icon: '👨‍✈️' },
    { name: 'Students.xlsx', icon: '🎒' },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Data Import Templates</Text>
      <Text style={styles.description}>Download excel templates to prepare your existing data for bulk import.</Text>

      <View style={styles.grid}>
        {templates.map((tpl) => (
          <TouchableOpacity 
            key={tpl.name}
            style={styles.templateItem}
            onPress={() => handleDownload(tpl.name)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>{tpl.icon}</Text>
            </View>
            <Text style={styles.templateName}>{tpl.name}</Text>
            <Text style={styles.downloadHint}>Download ↓</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24, // Last card has extra margin
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 1,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconText: {
    fontSize: 20,
  },
  templateName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  downloadHint: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
});
