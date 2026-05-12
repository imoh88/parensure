import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { F } from '@/lib/fonts';
import { appointmentCache } from '@/lib/utils/appointmentCache';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Building, Calendar, Call, Edit2, Location, Sms, Timer1 } from 'iconsax-react-native';
import React, { useCallback } from 'react';
import {
  BackHandler,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function formatApptDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
}

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const appt = appointmentCache.get() as any;

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (from) router.push(from as any);
      else router.back();
      return true;
    });
    return () => sub.remove();
  }, [router, from]));

  if (!appt) {
    return (
      <ScreenWrapper bg="#FFFFFF" avoidKeyboard={false}>
        <View style={s.center}>
          <Text style={s.errorText}>Appointment not found.</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const handleBack = () => {
    if (from) router.push(from as any);
    else router.back();
  };

  const handleEdit = () => {
    router.push({ pathname: '/(app)/add-appointment', params: { apptId: appt._id ?? appt.id, from: '/(app)/appointment-detail' } });
  };

  const handleDirections = () => {
    if (appt.location) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.location)}`;
      Linking.openURL(url);
    }
  };

  const isHigh = appt.priority === 'HIGH';
  const timeLabel = appt.scheduledTimes?.[0] ?? '—';
  const dateLabel = appt.startDate ? formatApptDate(appt.startDate) : '—';

  return (
    <ScreenWrapper bg="#FFFFFF" avoidKeyboard={false}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Appointments</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Title + badge */}
        <Text style={s.title}>{appt.title}</Text>
        {isHigh && (
          <View style={s.criticalBadge}>
            <Text style={s.criticalText}>CRITICAL</Text>
          </View>
        )}

        {/* Provider + location meta */}
        <View style={s.metaBlock}>
          {appt.providerName ? (
            <View style={s.metaRow}>
              <Building size={16} color="#9CA3AF" variant="Linear" />
              <Text style={s.metaText}>{appt.providerName}</Text>
            </View>
          ) : null}
          {appt.location ? (
            <View style={s.metaRow}>
              <Location size={16} color="#9CA3AF" variant="Linear" />
              <Text style={s.metaText}>{appt.location}</Text>
            </View>
          ) : null}
        </View>

        {/* Edit icon */}
        <TouchableOpacity style={s.editIconBtn} onPress={handleEdit} activeOpacity={0.7}>
          <Edit2 size={20} color="#E53935" variant="Linear" />
        </TouchableOpacity>

        {/* Date + Time cards */}
        <View style={s.infoRow}>
          <View style={s.infoCard}>
            <Calendar size={22} color="#E53935" variant="Linear" />
            <Text style={s.infoCardLabel}>DATE</Text>
            <Text style={s.infoCardValue}>{dateLabel}</Text>
          </View>
          <View style={s.infoCard}>
            <Timer1 size={22} color="#E53935" variant="Linear" />
            <Text style={s.infoCardLabel}>TIME</Text>
            <Text style={s.infoCardValue}>{timeLabel}</Text>
          </View>
        </View>

        {/* Location section */}
        {appt.location ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Location</Text>
            <View style={s.locationCard}>
              <View style={s.locationHeader}>
                <Location size={20} color="#E53935" variant="Bold" />
                <View style={{ flex: 1 }}>
                  <Text style={s.locationName}>{appt.location}</Text>
                  {appt.locationAddress ? (
                    <Text style={s.locationAddress}>{appt.locationAddress}</Text>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity style={s.directionsBtn} onPress={handleDirections} activeOpacity={0.8}>
                <Text style={s.directionsBtnText}>Get Directions</Text>
              </TouchableOpacity>
              {/* Map placeholder */}
              <View style={s.mapPlaceholder}>
                <View style={s.mapGrid}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} style={[s.mapLine, { backgroundColor: i % 2 === 0 ? '#D1E8D1' : '#C8DCDE' }]} />
                  ))}
                </View>
                <View style={s.mapPin}>
                  <Location size={20} color="#E53935" variant="Bold" />
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Instructions */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <View style={s.sectionTitleRow}>
              <Location size={16} color="#E53935" variant="Bold" />
              <Text style={s.sectionTitle}>Instructions</Text>
            </View>
            <TouchableOpacity onPress={handleEdit} activeOpacity={0.7}>
              <Text style={s.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={s.instructionsBox}>
            <Text style={s.instructionsText}>
              {appt.notes || 'No instructions provided.'}
            </Text>
          </View>
        </View>

        {/* Provider Support */}
        {appt.providerPhone ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Provider Support</Text>
            <View style={s.supportCard}>
              <TouchableOpacity
                style={s.supportRow}
                activeOpacity={0.7}
                onPress={() => appt.providerPhone && Linking.openURL(`tel:${appt.providerPhone}`)}
              >
                <View style={s.supportIconWrap}>
                  <Call size={18} color="#E53935" variant="Linear" />
                </View>
                <Text style={s.supportText}>Clinic Phone</Text>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
              <View style={s.supportDivider} />
              <TouchableOpacity style={s.supportRow} activeOpacity={0.7}>
                <View style={s.supportIconWrap}>
                  <Sms size={18} color="#E53935" variant="Linear" />
                </View>
                <Text style={s.supportText}>Message Provider</Text>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Actions */}
        <TouchableOpacity style={s.saveBtn} onPress={handleEdit} activeOpacity={0.85}>
          <Text style={s.saveBtnText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={handleBack} activeOpacity={0.7}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, fontFamily: F.i.regular, color: '#9CA3AF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#FFF',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  title: { fontSize: 32, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.8, marginTop: 16, marginBottom: 8 },
  criticalBadge: {
    alignSelf: 'flex-start', backgroundColor: '#FEE2E2',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14,
  },
  criticalText: { fontSize: 11, fontFamily: F.m.bold, color: '#E53935', letterSpacing: 0.5 },

  metaBlock: { gap: 6, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 14, fontFamily: F.i.regular, color: '#6B7280' },

  editIconBtn: { alignSelf: 'flex-end', marginBottom: 12, padding: 4 },

  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  infoCard: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, padding: 14, gap: 6,
  },
  infoCardLabel: { fontSize: 10, fontFamily: F.m.bold, color: '#9CA3AF', letterSpacing: 0.8, marginTop: 4 },
  infoCardValue: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111', marginBottom: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editLink: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },

  locationCard: { backgroundColor: '#F9FAFB', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  locationHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  locationName: { fontSize: 15, fontFamily: F.m.bold, color: '#111' },
  locationAddress: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280', marginTop: 2, lineHeight: 17 },
  directionsBtn: {
    marginHorizontal: 14, marginBottom: 14,
    borderRadius: 50, borderWidth: 1.5, borderColor: '#E53935',
    paddingVertical: 12, alignItems: 'center',
  },
  directionsBtnText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },
  mapPlaceholder: {
    height: 140, backgroundColor: '#C8DCDE',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  mapGrid: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', flexWrap: 'wrap' },
  mapLine: { width: '50%', height: 3, marginVertical: 14, opacity: 0.7 },
  mapPin: { position: 'absolute' },

  instructionsBox: {
    backgroundColor: '#FEF3EC', borderRadius: 14, padding: 16,
    borderLeftWidth: 3, borderLeftColor: '#F59E0B',
  },
  instructionsText: { fontSize: 14, fontFamily: F.i.regular, color: '#374151', lineHeight: 22 },

  supportCard: { backgroundColor: '#F3F4F6', borderRadius: 16, overflow: 'hidden' },
  supportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  supportIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  supportText: { flex: 1, fontSize: 15, fontFamily: F.m.semiBold, color: '#111' },
  chevron: { fontSize: 20, color: '#9CA3AF' },
  supportDivider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 16 },

  saveBtn: {
    backgroundColor: '#E53935', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#FFF', fontFamily: F.m.bold, fontSize: 16 },
  cancelBtn: {
    borderRadius: 50, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#E53935',
  },
  cancelBtnText: { color: '#E53935', fontFamily: F.m.semiBold, fontSize: 15 },
});
