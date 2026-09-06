import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  FALLBACK_ROUTES,
  filterRoutes,
  formatDistanceKm,
  fetchLiveRoutes,
  fetchLiveCities,
  MobileRouteItem,
} from '../services/routeService';
import { useTheme } from '../services/themeContext';
import { RouteShapePreview } from '../components/RouteShapePreview';

export default function DirectoryScreen() {
  const router = useRouter();
  const { theme, mode, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [routes, setRoutes] = useState<MobileRouteItem[]>(FALLBACK_ROUTES);
  const [cities, setCities] = useState<string[]>([
    'all',
    'Yogyakarta',
    'Bandung',
    'Jakarta',
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categories = [
    { id: 'all', label: 'Semua' },
    { id: 'animal', label: 'Hewan 🐾' },
    { id: 'object', label: 'Benda 🎯' },
    { id: 'symbol', label: 'Simbol ⭐️' },
  ];

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const [liveRoutes, liveCities] = await Promise.all([
        fetchLiveRoutes(),
        fetchLiveCities(),
      ]);
      setRoutes(liveRoutes);
      setCities(['all', ...liveCities]);
    } catch {
      // Keep existing routes
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRoutes = useMemo(() => {
    return filterRoutes(routes, {
      query: searchQuery,
      city: selectedCity,
      shapeCategory: selectedCategory as any,
    });
  }, [routes, searchQuery, selectedCity, selectedCategory]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.paper }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.ink }]}>RUTE UNIK</Text>
            <Text style={[styles.subtitle, { color: theme.inkMuted }]}>
              GPS Art Running Directory
            </Text>
          </View>
          <View style={styles.headerRight}>
            {/* 1-Tap Theme Toggle */}
            <TouchableOpacity
              style={[
                styles.themeToggle,
                {
                  backgroundColor: theme.chalk,
                  borderColor: theme.cardBorder,
                },
              ]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Text style={[styles.themeToggleText, { color: theme.ink }]}>
                {mode === 'light' ? '☀️ Paper' : '🌙 AMOLED'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.searchBg,
                borderColor: theme.searchBorder,
                color: theme.ink,
              },
            ]}
            placeholder="Cari rute (kucing, bintang, dago)..."
            placeholderTextColor={theme.inkMuted}
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
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? theme.chipActiveBg
                        : theme.chipBg,
                      borderColor: active
                        ? theme.chipActiveBorder
                        : theme.chipBorder,
                    },
                  ]}
                  onPress={() => setSelectedCity(city)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: active
                          ? theme.chipTextActive
                          : theme.chipText,
                      },
                    ]}
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
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? theme.chipActiveBg
                        : theme.chipBg,
                      borderColor: active
                        ? theme.chipActiveBorder
                        : theme.chipBorder,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: active
                          ? theme.chipTextActive
                          : theme.chipText,
                      },
                    ]}
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
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadData(true)}
              tintColor={theme.trailOrange}
            />
          }
        >
          {isLoading && !isRefreshing ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.trailOrange} />
              <Text style={{ color: theme.inkMuted, marginTop: 12, fontSize: 13 }}>
                Memuat rute dari database...
              </Text>
            </View>
          ) : (
            <Text style={[styles.resultsCount, { color: theme.inkMuted }]}>
              Menampilkan {filteredRoutes.length} rute GPS Art
            </Text>
          )}

          {filteredRoutes.map((route: MobileRouteItem) => (
            <TouchableOpacity
              key={route.id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.chalk,
                  borderColor: theme.cardBorder,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => router.push(`/route/${route.id}`)}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.ink }]}>
                    {route.name}
                  </Text>
                  <Text style={[styles.cardCity, { color: theme.inkMuted }]}>
                    {route.city}
                  </Text>
                </View>
                <View
                  style={[
                    styles.categoryBadge,
                    {
                      backgroundColor: theme.badgeBg,
                      borderColor: theme.badgeBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryBadgeText,
                      { color: theme.badgeText },
                    ]}
                  >
                    {route.shapeCategory.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* GPS Art Shape Visual Preview */}
              <View
                style={[
                  styles.shapePreviewBox,
                  {
                    backgroundColor: theme.chalkSubtle,
                    borderColor: theme.contourTan,
                  },
                ]}
              >
                <RouteShapePreview
                  svgXml={route.thumbnailSvg}
                  strokeColor={theme.routeStroke}
                  strokeWidth={3.5}
                  size={120}
                  fallbackLabel={route.name}
                />
                <View
                  style={[
                    styles.shapeBadgeOverlay,
                    {
                      backgroundColor:
                        mode === 'light'
                          ? 'rgba(247, 245, 239, 0.92)'
                          : 'rgba(10, 17, 12, 0.85)',
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.shapeBadgeText,
                      {
                        color:
                          mode === 'light'
                            ? theme.trailOrange
                            : theme.routeStroke,
                      },
                    ]}
                  >
                    GPS ART
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.cardFooter,
                  { borderTopColor: theme.contourTan },
                ]}
              >
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: theme.inkMuted }]}>
                    JARAK
                  </Text>
                  <Text style={[styles.statValue, { color: theme.ink }]}>
                    {formatDistanceKm(route.distanceMeters)}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: theme.inkMuted }]}>
                    ELEVASI
                  </Text>
                  <Text style={[styles.statValue, { color: theme.ink }]}>
                    +{route.elevationGainMeters ?? 0}m
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.runButton,
                    { backgroundColor: theme.primaryButtonBg },
                  ]}
                  onPress={() => router.push(`/run/${route.id}`)}
                >
                  <Text
                    style={[
                      styles.runButtonText,
                      { color: theme.primaryButtonText },
                    ]}
                  >
                    LARI 🏃‍♂️
                  </Text>
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
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchContainer: {
    marginVertical: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
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
    borderWidth: 1,
    borderRadius: 12,
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
  },
  cardCity: {
    fontSize: 13,
    marginTop: 2,
  },
  categoryBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  runButtonText: {
    fontWeight: '800',
    fontSize: 12,
  },
  shapePreviewBox: {
    borderWidth: 1,
    borderRadius: 8,
    height: 140,
    marginVertical: 10,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  shapeBadgeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(10, 17, 12, 0.85)',
    borderColor: '#1f3525',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shapeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 0.5,
  },
});
