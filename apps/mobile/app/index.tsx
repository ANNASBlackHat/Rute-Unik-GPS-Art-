import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  FALLBACK_ROUTES,
  filterRoutes,
  formatDistanceKm,
  MobileRouteItem,
} from '../services/routeService';

export default function DirectoryScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const cities = ['all', 'Yogyakarta', 'Bandung', 'Jakarta'];
  const categories = [
    { id: 'all', label: 'Semua' },
    { id: 'animal', label: 'Hewan 🐾' },
    { id: 'object', label: 'Benda 🎯' },
    { id: 'symbol', label: 'Simbol ⭐️' },
  ];

  const filteredRoutes = useMemo(() => {
    return filterRoutes(FALLBACK_ROUTES, {
      query: searchQuery,
      city: selectedCity,
      shapeCategory: selectedCategory as any,
    });
  }, [searchQuery, selectedCity, selectedCategory]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>RUTE UNIK</Text>
            <Text style={styles.subtitle}>GPS Art Running Directory</Text>
          </View>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>Mobile Run</Text>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari rute (kucing, bintang, dago)..."
            placeholderTextColor="#68726b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* City Filter Chips */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {cities.map((city) => {
              const active = selectedCity === city;
              return (
                <TouchableOpacity
                  key={city}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSelectedCity(city)}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {city === 'all' ? 'Semua Kota' : city}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Category Filter Chips */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Route Cards List */}
        <ScrollView
          style={styles.routeList}
          contentContainerStyle={styles.routeListContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.resultsCount}>
            Menampilkan {filteredRoutes.length} rute GPS Art
          </Text>

          {filteredRoutes.map((route: MobileRouteItem) => (
            <TouchableOpacity
              key={route.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => router.push(`/route/${route.id}`)}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>{route.name}</Text>
                  <Text style={styles.cardCity}>{route.city}</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {route.shapeCategory.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>JARAK</Text>
                  <Text style={styles.statValue}>
                    {formatDistanceKm(route.distanceMeters)}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>ELEVASI</Text>
                  <Text style={styles.statValue}>
                    +{route.elevationGainMeters ?? 0}m
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.runButton}
                  onPress={() => router.push(`/run/${route.id}`)}
                >
                  <Text style={styles.runButtonText}>LARI 🏃‍♂️</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0c0f0d',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#e8ece9',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#89958d',
    marginTop: 2,
  },
  badgeContainer: {
    backgroundColor: '#17231a',
    borderColor: '#2e4933',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34d399',
  },
  searchContainer: {
    marginVertical: 8,
  },
  searchInput: {
    backgroundColor: '#151b17',
    borderColor: '#253329',
    borderWidth: 1,
    borderRadius: 12,
    color: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  filterSection: {
    marginVertical: 4,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: '#171e19',
    borderColor: '#253329',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: '#059669',
    borderColor: '#34d399',
  },
  chipText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  routeList: {
    flex: 1,
    marginTop: 10,
  },
  routeListContent: {
    paddingBottom: 24,
  },
  resultsCount: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#131915',
    borderColor: '#202c23',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f9fafb',
  },
  cardCity: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: '#1c2820',
    borderColor: '#2d4032',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#6ee7b7',
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1d2620',
  },
  statItem: {
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f3f4f6',
    marginTop: 2,
  },
  runButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  runButtonText: {
    color: '#062817',
    fontWeight: '800',
    fontSize: 12,
  },
});
