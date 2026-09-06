import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  FALLBACK_ROUTES,
  formatDistanceKm,
  fetchLiveRouteDetail,
  MobileRouteDetail,
  getRouteDetailWithCoordinates,
} from '../../services/routeService';
import { RouteShapePreview } from '../../components/RouteShapePreview';
import { useTheme } from '../../services/themeContext';

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme, mode, toggleTheme } = useTheme();

  const [route, setRoute] = useState<MobileRouteDetail>(() =>
    getRouteDetailWithCoordinates(id ?? 'kucing-ugm')
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    async function load() {
      try {
        const detail = await fetchLiveRouteDetail(id);
        if (isMounted) {
          setRoute(detail);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.paper }]}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Title Card with Theme Toggle */}
          <View
            style={[
              styles.titleCard,
              {
                backgroundColor: theme.chalk,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <View style={styles.titleCardTop}>
              <View
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: theme.badgeBg,
                    borderColor: theme.badgeBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.categoryText, { color: theme.badgeText }]}
                >
                  {route.shapeCategory.toUpperCase()} GPS ART
                </Text>
              </View>

              {/* 1-Tap Theme Toggle */}
              <TouchableOpacity
                style={[
                  styles.themeToggle,
                  {
                    backgroundColor: theme.chalkSubtle,
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

            <Text style={[styles.routeName, { color: theme.ink }]}>
              {route.name}
            </Text>
            <Text style={[styles.routeCity, { color: theme.inkMuted }]}>
              📍 {route.city}, Indonesia
            </Text>
          </View>

          {/* Hero GPS Art Shape Canvas */}
          <View
            style={[
              styles.heroShapeCard,
              {
                backgroundColor: theme.chalk,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <View style={styles.heroShapeHeader}>
              <Text
                style={[styles.heroShapeTitle, { color: theme.inkMuted }]}
              >
                BENTUK GPS ART
              </Text>
              <View
                style={[
                  styles.heroShapeBadge,
                  {
                    backgroundColor: theme.badgeBg,
                    borderColor: theme.badgeBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.heroShapeBadgeText,
                    {
                      color:
                        mode === 'light'
                          ? theme.trailOrange
                          : theme.routeStroke,
                    },
                  ]}
                >
                  100% Sesuai Rute
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.heroShapeBox,
                {
                  backgroundColor: theme.chalkSubtle,
                  borderColor: theme.contourTan,
                },
              ]}
            >
              <RouteShapePreview
                svgXml={route.thumbnailSvg}
                coordinates={route.coordinates}
                strokeColor={theme.routeStroke}
                strokeWidth={3.8}
                size={200}
                showEndpoints={true}
                fallbackLabel={route.name}
              />
            </View>

            <Text
              style={[styles.heroShapeHint, { color: theme.inkMuted }]}
            >
              💡 Gambar bentuk ini di atas peta jalanan dengan berlari mengikuti
              panduan suara turn-by-turn.
            </Text>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statBox,
                {
                  backgroundColor: theme.chalk,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.statLabel, { color: theme.inkMuted }]}>
                JARAK TOTAL
              </Text>
              <Text style={[styles.statNumber, { color: theme.ink }]}>
                {formatDistanceKm(route.distanceMeters)}
              </Text>
            </View>

            <View
              style={[
                styles.statBox,
                {
                  backgroundColor: theme.chalk,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.statLabel, { color: theme.inkMuted }]}>
                ELEVASI
              </Text>
              <Text style={[styles.statNumber, { color: theme.ink }]}>
                +{route.elevationGainMeters ?? 0}m
              </Text>
            </View>

            <View
              style={[
                styles.statBox,
                {
                  backgroundColor: theme.chalk,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.statLabel, { color: theme.inkMuted }]}>
                TOTAL BELOKAN
              </Text>
              <Text style={[styles.statNumber, { color: theme.ink }]}>
                {route.totalTurns ?? route.turnCues?.length ?? 0}
              </Text>
            </View>
          </View>

          {/* Audio Guidance Feature Callout */}
          <View
            style={[
              styles.featureCard,
              {
                backgroundColor:
                  mode === 'light' ? theme.chalkSubtle : '#122318',
                borderColor:
                  mode === 'light' ? theme.contourTan : '#1d3e28',
              },
            ]}
          >
            <Text
              style={[
                styles.featureTitle,
                {
                  color:
                    mode === 'light' ? theme.trailOrange : '#34d399',
                },
              ]}
            >
              🔊 Panduan Suara Turn-by-Turn
            </Text>
            <Text
              style={[
                styles.featureDescription,
                {
                  color: mode === 'light' ? theme.ink : '#d1fae5',
                },
              ]}
            >
              Aplikasi ini akan memandu arah lari Anda secara otomatis:
            </Text>
            <View style={styles.bulletList}>
              <Text
                style={[
                  styles.bulletItem,
                  { color: mode === 'light' ? theme.inkMuted : '#a7f3d0' },
                ]}
              >
                • Notifikasi belokan di latar belakang (layar terkunci).
              </Text>
              <Text
                style={[
                  styles.bulletItem,
                  { color: mode === 'light' ? theme.inkMuted : '#a7f3d0' },
                ]}
              >
                • Peringatan suara otomatis saat belok kanan / kiri.
              </Text>
              <Text
                style={[
                  styles.bulletItem,
                  { color: mode === 'light' ? theme.inkMuted : '#a7f3d0' },
                ]}
              >
                • Alarm instan jika keluar dari jalur bentuk GPS Art.
              </Text>
              <Text
                style={[
                  styles.bulletItem,
                  { color: mode === 'light' ? theme.inkMuted : '#a7f3d0' },
                ]}
              >
                • Musik (Spotify) mengecil otomatis saat suara pemandu bicara.
              </Text>
            </View>
          </View>

          {/* Route Info Section */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.chalk,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Text
              style={[styles.infoHeading, { color: theme.inkMuted }]}
            >
              TIPS BERLARI
            </Text>
            <Text style={[styles.infoBody, { color: theme.ink }]}>
              Pastikan GPS diatur ke Akurasi Tinggi. Taruh HP di saku atau
              armband, pasang earphone, dan dengarkan panduan suara tanpa perlu
              terus melihat layar.
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Floating Action Button */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.paper,
              borderTopColor: theme.contourTan,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.startButton,
              { backgroundColor: theme.primaryButtonBg },
            ]}
            activeOpacity={0.85}
            onPress={() => router.push(`/run/${route.id}`)}
          >
            <Text
              style={[
                styles.startButtonText,
                { color: theme.primaryButtonText },
              ]}
            >
              MULAI LARI SEKARANG 🏃‍♂️
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0c0f0d',
  },
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  titleCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
  },
  titleCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryPill: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  themeToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  routeName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  routeCity: {
    fontSize: 13,
  },
  heroShapeCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
  },
  heroShapeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroShapeTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroShapeBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  heroShapeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  heroShapeBox: {
    borderWidth: 1,
    borderRadius: 10,
    height: 230,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heroShapeHint: {
    fontSize: 12,
    color: '#89958d',
    lineHeight: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  featureCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 13,
    marginBottom: 10,
  },
  bulletList: {
    gap: 6,
  },
  bulletItem: {
    fontSize: 12,
    lineHeight: 18,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  infoHeading: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  startButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
