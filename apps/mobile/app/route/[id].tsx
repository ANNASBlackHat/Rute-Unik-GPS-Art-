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

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Title Card */}
          <View style={styles.titleCard}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>
                {route.shapeCategory.toUpperCase()} GPS ART
              </Text>
            </View>
            <Text style={styles.routeName}>{route.name}</Text>
            <Text style={styles.routeCity}>📍 {route.city}, Indonesia</Text>
          </View>

          {/* Hero GPS Art Shape Canvas */}
          <View style={styles.heroShapeCard}>
            <View style={styles.heroShapeHeader}>
              <Text style={styles.heroShapeTitle}>BENTUK GPS ART</Text>
              <View style={styles.heroShapeBadge}>
                <Text style={styles.heroShapeBadgeText}>100% Sesuai Rute</Text>
              </View>
            </View>

            <View style={styles.heroShapeBox}>
              <RouteShapePreview
                svgXml={route.thumbnailSvg}
                coordinates={route.coordinates}
                strokeColor="#34d399"
                strokeWidth={3.8}
                size={200}
                showEndpoints={true}
                fallbackLabel={route.name}
              />
            </View>

            <Text style={styles.heroShapeHint}>
              💡 Gambar bentuk ini di atas peta jalanan dengan berlari mengikuti panduan suara turn-by-turn.
            </Text>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>JARAK TOTAL</Text>
              <Text style={styles.statNumber}>
                {formatDistanceKm(route.distanceMeters)}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ELEVASI</Text>
              <Text style={styles.statNumber}>
                +{route.elevationGainMeters ?? 0}m
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>TOTAL BELOKAN</Text>
              <Text style={styles.statNumber}>
                {route.totalTurns ?? route.turnCues?.length ?? 0}
              </Text>
            </View>
          </View>

          {/* Audio Guidance Feature Callout */}
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>🔊 Panduan Suara Turn-by-Turn</Text>
            <Text style={styles.featureDescription}>
              Aplikasi ini akan memandu arah lari Anda secara otomatis:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>
                • Notifikasi belokan di latar belakang (layar terkunci).
              </Text>
              <Text style={styles.bulletItem}>
                • Peringatan suara otomatis saat belok kanan / kiri.
              </Text>
              <Text style={styles.bulletItem}>
                • Alarm instan jika keluar dari jalur bentuk GPS Art.
              </Text>
              <Text style={styles.bulletItem}>
                • Musik (Spotify) mengecil otomatis saat suara pemandu bicara.
              </Text>
            </View>
          </View>

          {/* Route Info Section */}
          <View style={styles.infoCard}>
            <Text style={styles.infoHeading}>TIPS BERLARI</Text>
            <Text style={styles.infoBody}>
              Pastikan GPS diatur ke Akurasi Tinggi. Taruh HP di saku atau armband,
              pasang earphone, dan dengarkan panduan suara tanpa perlu terus melihat layar.
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Floating Action Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.startButton}
            activeOpacity={0.85}
            onPress={() => router.push(`/run/${route.id}`)}
          >
            <Text style={styles.startButtonText}>MULAI LARI SEKARANG 🏃‍♂️</Text>
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
    backgroundColor: '#131915',
    borderColor: '#223126',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#1c2820',
    borderColor: '#2e4534',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34d399',
  },
  routeName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  routeCity: {
    fontSize: 14,
    color: '#9ca3af',
  },
  heroShapeCard: {
    backgroundColor: '#131915',
    borderColor: '#223126',
    borderWidth: 1,
    borderRadius: 20,
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
    color: '#9ca3af',
    letterSpacing: 1,
  },
  heroShapeBadge: {
    backgroundColor: '#1a2c1f',
    borderColor: '#2e4933',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  heroShapeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34d399',
  },
  heroShapeBox: {
    backgroundColor: '#0a110c',
    borderColor: '#19281e',
    borderWidth: 1,
    borderRadius: 16,
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
    backgroundColor: '#131915',
    borderColor: '#223126',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f3f4f6',
  },
  featureCard: {
    backgroundColor: '#122318',
    borderColor: '#1d3e28',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34d399',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 13,
    color: '#d1fae5',
    marginBottom: 10,
  },
  bulletList: {
    gap: 6,
  },
  bulletItem: {
    fontSize: 12,
    color: '#a7f3d0',
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: '#131915',
    borderColor: '#223126',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  infoHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: 6,
  },
  infoBody: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0c0f0d',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a231d',
  },
  startButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#042714',
    letterSpacing: 0.5,
  },
});
