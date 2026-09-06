import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  FALLBACK_ROUTES,
  formatDistanceKm,
  formatRunDuration,
} from '../../services/routeService';

export default function RunModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const route =
    FALLBACK_ROUTES.find((r) => r.id === id) || FALLBACK_ROUTES[0];

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [distanceCoveredMeters, setDistanceCoveredMeters] = useState(0);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [currentPace, setCurrentPace] = useState('05:30');
  const [upcomingTurn, setUpcomingTurn] = useState({
    direction: 'Belok kanan',
    distanceMeters: 30,
    instruction: 'Dalam 30 meter, belok kanan.',
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [language, setLanguage] = useState<'id' | 'en'>('id');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stopwatch timer
  useEffect(() => {
    if (!isPaused && !isCompleted) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
        // Simulate progressive distance increase
        setDistanceCoveredMeters((m) => Math.min(route.distanceMeters, m + 3));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isCompleted, route.distanceMeters]);

  const completionPercent = Math.min(
    100,
    Math.round((distanceCoveredMeters / route.distanceMeters) * 100)
  );

  const togglePause = () => {
    setIsPaused((p) => !p);
  };

  const handleFinish = () => {
    Alert.alert(
      'Selesaikan Lari?',
      'Apakah Anda ingin mengakhiri sesi lari GPS Art ini?',
      [
        { text: 'Lanjut Lari', style: 'cancel' },
        {
          text: 'Selesai',
          style: 'destructive',
          onPress: () => setIsCompleted(true),
        },
      ]
    );
  };

  const handleExit = () => {
    if (isCompleted) {
      router.replace('/');
      return;
    }

    Alert.alert(
      'Keluar dari Mode Lari?',
      'Progres lari saat ini tidak akan disimpan.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Keluar', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topRouteName}>{route.name}</Text>
            <View style={styles.gpsRow}>
              <View style={styles.gpsDot} />
              <Text style={styles.gpsText}>GPS Aktif • Akurasi ±5m</Text>
            </View>
          </View>

          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={styles.langButton}
              onPress={() => setLanguage((l) => (l === 'id' ? 'en' : 'id'))}
            >
              <Text style={styles.langButtonText}>
                {language === 'id' ? 'ID 🇮🇩' : 'EN 🇬🇧'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
              <Text style={styles.exitButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Turn Guidance Live Card */}
        <View style={styles.turnCard}>
          <View style={styles.turnIconBox}>
            <Text style={styles.turnIconText}>➡️</Text>
          </View>
          <View style={styles.turnTextBox}>
            <Text style={styles.turnDistanceText}>
              {upcomingTurn.direction} dlm {upcomingTurn.distanceMeters}m
            </Text>
            <Text style={styles.turnInstructionText}>
              {upcomingTurn.instruction}
            </Text>
          </View>
        </View>

        {/* Off-Route Warning (conditionally shown or toggled) */}
        {isOffRoute && (
          <View style={styles.offRouteBanner}>
            <Text style={styles.offRouteIcon}>⚠️</Text>
            <Text style={styles.offRouteText}>
              KELUAR DARI JALUR! Putar balik ke arah rute.
            </Text>
          </View>
        )}

        {/* Big HUD Metrics Grid */}
        <View style={styles.hudGrid}>
          {/* Timer Card */}
          <View style={styles.hudCard}>
            <Text style={styles.hudLabel}>WAKTU</Text>
            <Text style={styles.hudTimer}>
              {formatRunDuration(elapsedSeconds)}
            </Text>
            <Text style={styles.hudSub}>
              {isPaused ? 'DIJEDA' : 'BERJALAN'}
            </Text>
          </View>

          {/* Distance Card */}
          <View style={styles.hudCard}>
            <Text style={styles.hudLabel}>JARAK</Text>
            <Text style={styles.hudMetric}>
              {formatDistanceKm(distanceCoveredMeters)}
            </Text>
            <Text style={styles.hudSub}>
              dari {formatDistanceKm(route.distanceMeters)}
            </Text>
          </View>

          {/* Pace Card */}
          <View style={styles.hudCard}>
            <Text style={styles.hudLabel}>PACE RATA-RATA</Text>
            <Text style={styles.hudMetric}>{currentPace}</Text>
            <Text style={styles.hudSub}>min / km</Text>
          </View>

          {/* Completion % Card */}
          <View style={styles.hudCard}>
            <Text style={styles.hudLabel}>PROGRES BENTUK</Text>
            <Text style={styles.hudMetric}>{completionPercent}%</Text>
            <Text style={styles.hudSub}>{route.shapeCategory.toUpperCase()}</Text>
          </View>
        </View>

        {/* Shape Completion Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${completionPercent}%` },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            Penyelesaian Bentuk GPS Art: {completionPercent}%
          </Text>
        </View>

        {/* Bottom Control Buttons */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={[
              styles.pauseButton,
              isPaused && styles.resumeButton,
            ]}
            activeOpacity={0.85}
            onPress={togglePause}
          >
            <Text style={styles.pauseButtonText}>
              {isPaused ? '▶️ LANJUT (RESUME)' : '⏸ JEDA (PAUSE)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.finishButton}
            activeOpacity={0.85}
            onPress={handleFinish}
          >
            <Text style={styles.finishButtonText}>SELESAI 🏁</Text>
          </TouchableOpacity>
        </View>

        {/* Completion Modal */}
        <Modal visible={isCompleted} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTrophy}>🎉 🏆 🐾</Text>
              <Text style={styles.modalTitle}>Selamat! Rute Selesai!</Text>
              <Text style={styles.modalSubtitle}>
                Anda berhasil menyelesaikan bentuk GPS Art &quot;{route.name}&quot;!
              </Text>

              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Total Waktu</Text>
                  <Text style={styles.modalStatVal}>
                    {formatRunDuration(elapsedSeconds)}
                  </Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Total Jarak</Text>
                  <Text style={styles.modalStatVal}>
                    {formatDistanceKm(distanceCoveredMeters)}
                  </Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Pace</Text>
                  <Text style={styles.modalStatVal}>{currentPace}/km</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => router.replace('/')}
              >
                <Text style={styles.modalCloseButtonText}>
                  KEMBALI KE DIREKTORI
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070a08',
  },
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  topRouteName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  gpsText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langButton: {
    backgroundColor: '#1a231c',
    borderColor: '#2d3d30',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  langButtonText: {
    color: '#f3f4f6',
    fontSize: 12,
    fontWeight: '700',
  },
  exitButton: {
    backgroundColor: '#261616',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitButtonText: {
    color: '#f87171',
    fontWeight: 'bold',
    fontSize: 16,
  },
  turnCard: {
    backgroundColor: '#102216',
    borderColor: '#1f482d',
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 10,
  },
  turnIconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#1b3e27',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnIconText: {
    fontSize: 24,
  },
  turnTextBox: {
    flex: 1,
  },
  turnDistanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34d399',
  },
  turnInstructionText: {
    fontSize: 13,
    color: '#d1fae5',
    marginTop: 2,
  },
  offRouteBanner: {
    backgroundColor: '#38160d',
    borderColor: '#7f1d1d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  offRouteIcon: {
    fontSize: 18,
  },
  offRouteText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  hudGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 10,
  },
  hudCard: {
    width: '48%',
    backgroundColor: '#111713',
    borderColor: '#1e2c22',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  hudLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  hudTimer: {
    fontSize: 28,
    fontWeight: '900',
    color: '#34d399',
  },
  hudMetric: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
  },
  hudSub: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  progressContainer: {
    marginVertical: 10,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#17221a',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 6,
  },
  bottomControls: {
    gap: 10,
    marginBottom: 8,
  },
  pauseButton: {
    backgroundColor: '#27272a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  resumeButton: {
    backgroundColor: '#047857',
  },
  pauseButtonText: {
    color: '#f3f4f6',
    fontWeight: 'bold',
    fontSize: 15,
  },
  finishButton: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#111713',
    borderColor: '#243b2b',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalTrophy: {
    fontSize: 48,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#34d399',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#d1fae5',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#17221a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
  },
  modalStatVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalCloseButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#062817',
    fontWeight: '800',
    fontSize: 14,
  },
});
