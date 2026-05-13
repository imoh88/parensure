import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { caregiverApi } from '@/lib/api/caregiver';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Add, ArrowDown2, ArrowLeft, CloseCircle, Trash } from 'iconsax-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────────────

const MED_TYPES   = ['Prescription', 'OTC', 'Supplement', 'Herbal', 'Compounded', 'Other'] as const;
const FORMS       = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Patch', 'Cream', 'Drops', 'Inhaler', 'Other'] as const;
const ROUTES      = ['Oral', 'Topical', 'Intravenous', 'Subcutaneous', 'Inhalation', 'Sublingual', 'Other'] as const;

type Frequency = 'ONE_TIME' | 'DAILY' | 'WEEKLY';
type Priority  = 'LOW' | 'NORMAL' | 'HIGH';
type IntakeMethod = 'SCHEDULED' | 'AS_NEEDED';

const FREQUENCIES: { label: string; value: Frequency }[] = [
  { label: 'One-time', value: 'ONE_TIME' },
  { label: 'Daily',    value: 'DAILY'    },
  { label: 'Weekly',   value: 'WEEKLY'   },
];

interface ScheduledTime { date: Date }
interface Receiver { careReceiverId: string; name: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeLabel(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDateDisplay(d: Date | null) {
  if (!d) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

// ─── Picker sheet modal ───────────────────────────────────────────────────────

function PickerSheetModal({ visible, mode, value, onConfirm, onCancel, title }: {
  visible: boolean; mode: 'date' | 'time'; value: Date;
  onConfirm: (d: Date) => void; onCancel: () => void; title?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (visible) setDraft(value); }, [visible, value]);

  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={draft} mode={mode} display="default"
        onChange={(_e, d) => { if (d) onConfirm(d); else onCancel(); }}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={ps.root}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={ps.backdrop} />
        </TouchableWithoutFeedback>
        <View style={ps.sheet}>
          <View style={ps.handle} />
          <View style={ps.header}>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7} hitSlop={12}>
              <Text style={ps.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={ps.title}>{title ?? (mode === 'time' ? 'Select Time' : 'Select Date')}</Text>
            <TouchableOpacity onPress={() => onConfirm(draft)} activeOpacity={0.7} hitSlop={12}>
              <Text style={ps.done}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={draft} mode={mode} display="spinner"
            textColor="#000000" themeVariant="light" style={ps.picker}
            onChange={(_e, d) => { if (d) setDraft(d); }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function Dropdown({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={dd.btn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[dd.value, !value && dd.placeholder]}>{value || label}</Text>
        <ArrowDown2 size={16} color="#9CA3AF" variant="Linear" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={dd.overlay} onPress={() => setOpen(false)}>
          <View style={dd.sheet}>
            <Text style={dd.sheetTitle}>{label}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((o) => (
                <TouchableOpacity
                  key={o} style={[dd.option, value === o && dd.optionActive]}
                  onPress={() => { onChange(o); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[dd.optionText, value === o && dd.optionTextActive]}>{o}</Text>
                  {value === o && <Ionicons name="checkmark-circle" size={18} color="#E53935" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}


// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AddMedicationManualScreen() {
  const router = useRouter();
  const { prefillName, prefillDosage, prefillInstructions, from } = useLocalSearchParams<{
    prefillName?: string; prefillDosage?: string; prefillInstructions?: string; from?: string;
  }>();

  const goBack = () => router.push((from as any) ?? '/(app)/add-medication');
  const { activeRole } = useAuthStore();
  const isCareReceiver = activeRole === 'CARE_RECEIVER';

  const [phase, setPhase] = useState<1 | 2>(1);

  // Care receivers
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [selectedReceiverId, setSelectedReceiverId] = useState('');
  const [showReceiverPicker, setShowReceiverPicker] = useState(false);
  const [loadingReceivers, setLoadingReceivers] = useState(true);

  const loadReceivers = useCallback(async () => {
    if (isCareReceiver) { setLoadingReceivers(false); return; }
    try {
      const res = await caregiverApi.getBookings();
      if (res.success && res.data) {
        const list: Receiver[] = (res.data as any[])
          .filter((b) => b.careReceiver?.user)
          .map((b) => ({ careReceiverId: b.careReceiverId, name: b.careReceiver?.user?.fullName ?? 'Unknown' }));
        setReceivers(list);
        if (list.length > 0 && list[0]) setSelectedReceiverId(list[0].careReceiverId);
      }
    } catch { /* silently fail */ }
    finally { setLoadingReceivers(false); }
  }, []);

  useEffect(() => { loadReceivers(); }, [loadReceivers]);

  // ── Phase 1 state ──────────────────────────────────────────────────────────
  const [name,         setName]         = useState(prefillName        ?? '');
  const [dosage,       setDosage]       = useState(prefillDosage      ?? '');
  const [medType,      setMedType]      = useState('Prescription');
  const [prescriber,   setPrescriber]   = useState('');
  const [pharmacy,     setPharmacy]     = useState('');
  const [intake,       setIntake]       = useState<IntakeMethod>('SCHEDULED');
  const [form,         setForm]         = useState('Tablet');
  const [route,        setRoute]        = useState('Oral');

  // ── Phase 2 state ──────────────────────────────────────────────────────────
  const defaultTime = new Date(); defaultTime.setHours(8, 0, 0, 0);
  const [currentTime,     setCurrentTime]     = useState<Date>(defaultTime);
  const [showTimePicker,  setShowTimePicker]  = useState(false);
  const [scheduledTimes,  setScheduledTimes]  = useState<ScheduledTime[]>([]);
  const [startDate,       setStartDate]       = useState<Date | null>(null);
  const [endDate,         setEndDate]         = useState<Date | null>(null);
  const [showStart,       setShowStart]       = useState(false);
  const [showEnd,         setShowEnd]         = useState(false);
  const [reminder,        setReminder]        = useState(30);
  const [frequency,       setFrequency]       = useState<Frequency>('ONE_TIME');
  const [priority,        setPriority]        = useState<Priority>('NORMAL');
  const [instructions,    setInstructions]    = useState(prefillInstructions ?? '');

  const [saving, setSaving] = useState(false);

  const addTime = () => {
    const label = formatTimeLabel(currentTime);
    if (!scheduledTimes.find((t) => formatTimeLabel(t.date) === label)) {
      setScheduledTimes((prev) => [...prev, { date: new Date(currentTime) }]);
    }
  };
  const removeTime = (i: number) => setScheduledTimes((prev) => prev.filter((_, idx) => idx !== i));

  const selectedReceiver = receivers.find((r) => r.careReceiverId === selectedReceiverId);

  const handlePhase1Continue = () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter a medication name.'); return; }
    if (!dosage.trim()) { Alert.alert('Required', 'Please enter a dosage.'); return; }
    if (!isCareReceiver && !selectedReceiverId) { Alert.alert('Required', 'Please select a care receiver.'); return; }
    setPhase(2);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const timeLabels = intake === 'SCHEDULED' ? scheduledTimes.map((t) => formatTimeLabel(t.date)) : [];
      await caregiverApi.createTask({
        careReceiverId: selectedReceiverId,
        title: name.trim(),
        description: [
          dosage.trim(), medType, form, route,
          prescriber ? `Prescriber: ${prescriber}` : '',
          pharmacy   ? `Pharmacy: ${pharmacy}` : '',
          instructions.trim(),
        ].filter(Boolean).join(' | '),
        category: 'MEDICATION',
        scheduledTimes: timeLabels,
        startDate:     startDate ? startDate.toISOString() : undefined,
        endDate:       endDate   ? endDate.toISOString()   : undefined,
        frequency,
        priority,
        reminderMinutes: reminder,
      });
      router.replace({ pathname: '/(app)/medication-success', params: { medName: name.trim() } });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? e?.message ?? 'Could not save medication.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Shared header ─────────────────────────────────────────────────────────

  const header = (
    <View style={s.header}>
      <TouchableOpacity style={s.backBtn} onPress={phase === 1 ? goBack : () => setPhase(1)} activeOpacity={0.7}>
        <ArrowLeft size={22} color="#E53935" variant="Linear" />
      </TouchableOpacity>
      <Text style={s.headerTitle}>Add Medication</Text>
      <TouchableOpacity style={s.backBtn} onPress={() => {
        Alert.alert('Discard?', 'Discard this medication?', [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: goBack },
        ]);
      }} activeOpacity={0.7}>
        <Trash size={20} color="#E53935" variant="Linear" />
      </TouchableOpacity>
    </View>
  );

  // ─── Progress bar ──────────────────────────────────────────────────────────

  const progress = (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: phase === 1 ? '50%' : '100%' }]} />
    </View>
  );

  // ─── Phase 1 render ────────────────────────────────────────────────────────

  if (phase === 1) {
    return (
      <ScreenWrapper bg="#F5F5F7" avoidKeyboard={false}>
        {header}
        {progress}

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.title}>New Medication</Text>
          <Text style={s.subtitle}>
            Ensure accuracy to help provide the best care. Double-check dosage instructions with the medical professional.
          </Text>

          {/* Care Receiver (caregivers only) */}
          {!isCareReceiver && (
            <>
              <Text style={s.label}>Care Receiver</Text>
              {loadingReceivers ? (
                <ActivityIndicator color="#E53935" style={{ marginBottom: 16 }} />
              ) : (
                <TouchableOpacity style={dd.btn} onPress={() => setShowReceiverPicker(true)} activeOpacity={0.8}>
                  <Text style={[dd.value, !selectedReceiver && dd.placeholder]}>
                    {selectedReceiver?.name ?? 'Select care receiver'}
                  </Text>
                  <ArrowDown2 size={16} color="#9CA3AF" variant="Linear" />
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Basic Information */}
          <Text style={s.sectionLabel}>Basic Information</Text>

          <Text style={s.label}>Medication Name</Text>
          <TextInput
            style={s.input} value={name} onChangeText={setName}
            placeholder="e.g. Lisinopril" placeholderTextColor="#C4C4C4"
          />

          <Text style={s.label}>Dosage</Text>
          <TextInput
            style={s.input} value={dosage} onChangeText={setDosage}
            placeholder="e.g. 500mg" placeholderTextColor="#C4C4C4"
          />

          <Text style={s.label}>Form</Text>
          <Dropdown label="Form" value={medType} options={MED_TYPES} onChange={setMedType} />

          <Text style={s.label}>Prescriber <Text style={s.optional}>(Optional)</Text></Text>
          <TextInput
            style={s.input} value={prescriber} onChangeText={setPrescriber}
            placeholder="" placeholderTextColor="#C4C4C4"
          />

          <Text style={s.label}>Pharmacy <Text style={s.optional}>(Optional)</Text></Text>
          <TextInput
            style={s.input} value={pharmacy} onChangeText={setPharmacy}
            placeholder="" placeholderTextColor="#C4C4C4"
          />

          {/* Intake Method */}
          <Text style={s.sectionLabelBold}>Intake Method</Text>
          <View style={s.intakeRow}>
            <TouchableOpacity
              style={[s.intakeCard, intake === 'SCHEDULED' && s.intakeCardActive]}
              onPress={() => setIntake('SCHEDULED')}
              activeOpacity={0.8}
            >
              {intake === 'SCHEDULED' && (
                <View style={s.intakeCheck}>
                  <Ionicons name="checkmark-circle" size={18} color="#E53935" />
                </View>
              )}
              <Ionicons
                name="alarm-outline"
                size={26}
                color={intake === 'SCHEDULED' ? '#E53935' : '#9CA3AF'}
              />
              <Text style={[s.intakeCardTitle, intake === 'SCHEDULED' && s.intakeCardTitleActive]}>
                Scheduled
              </Text>
              <Text style={s.intakeCardDesc}>Take at specific times throughout the day.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.intakeCard, intake === 'AS_NEEDED' && s.intakeCardActive]}
              onPress={() => setIntake('AS_NEEDED')}
              activeOpacity={0.8}
            >
              {intake === 'AS_NEEDED' && (
                <View style={s.intakeCheck}>
                  <Ionicons name="checkmark-circle" size={18} color="#E53935" />
                </View>
              )}
              <Ionicons
                name="fitness-outline"
                size={26}
                color={intake === 'AS_NEEDED' ? '#E53935' : '#9CA3AF'}
              />
              <Text style={[s.intakeCardTitle, intake === 'AS_NEEDED' && s.intakeCardTitleActive]}>
                As Needed
              </Text>
              <Text style={s.intakeCardDesc}>Take only when symptoms occur (PRN).</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Form</Text>
          <Dropdown label="Form" value={form} options={FORMS} onChange={setForm} />

          <Text style={s.label}>Route</Text>
          <Dropdown label="Route" value={route} options={ROUTES} onChange={setRoute} />

          <Text style={s.footerNote}>Parensure provides reminders only.</Text>

          <TouchableOpacity style={s.continueBtn} onPress={handlePhase1Continue} activeOpacity={0.85}>
            <Text style={s.continueBtnText}>Save &amp; Continue</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Care Receiver Picker */}
        <Modal visible={showReceiverPicker} transparent animationType="fade" onRequestClose={() => setShowReceiverPicker(false)}>
          <Pressable style={dd.overlay} onPress={() => setShowReceiverPicker(false)}>
            <View style={dd.sheet}>
              <Text style={dd.sheetTitle}>Select Care Receiver</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {receivers.length === 0 ? (
                  <Text style={s.noReceiversText}>No care receivers found. Add one from your care circle.</Text>
                ) : receivers.map((r) => (
                  <TouchableOpacity
                    key={r.careReceiverId}
                    style={[dd.option, selectedReceiverId === r.careReceiverId && dd.optionActive]}
                    onPress={() => { setSelectedReceiverId(r.careReceiverId); setShowReceiverPicker(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[dd.optionText, selectedReceiverId === r.careReceiverId && dd.optionTextActive]}>
                      {r.name}
                    </Text>
                    {selectedReceiverId === r.careReceiverId && <Ionicons name="checkmark-circle" size={18} color="#E53935" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </ScreenWrapper>
    );
  }

  // ─── Phase 2 render ────────────────────────────────────────────────────────

  return (
    <ScreenWrapper bg="#F5F5F7" avoidKeyboard={false}>
      {header}
      {progress}

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>New Medication</Text>
        <Text style={s.subtitle}>
          Ensure accuracy to help provide the best care. Double-check dosage instructions with the medical professional.
        </Text>

        {/* Time & Duration */}
        <Text style={s.sectionLabel}>Dose Schedule</Text>

        <View style={s.timeSectionCard}>
          <Text style={s.timeSectionTitle}>Time &amp; Duration</Text>

          {/* Time picker trigger */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>Scheduled Time</Text>
            <TouchableOpacity
              style={s.timeTrigger}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.8}
            >
              <View style={s.timeTriggerLeft}>
                <Text style={s.timeTriggerValue}>{formatTimeLabel(currentTime)}</Text>
                <Text style={s.timeTriggerHint}>Tap to change</Text>
              </View>
              <View style={s.timeTriggerBadge}>
                <Text style={s.timeTriggerBadgeText}>🕐</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Add time button */}
          <TouchableOpacity style={s.addTimeBtn} onPress={addTime} activeOpacity={0.8}>
            <Add size={18} color="#E53935" variant="Linear" />
            <Text style={s.addTimeBtnText}>Add This Time</Text>
          </TouchableOpacity>
          <Text style={s.addTimeHint}>Add multiple times if taken at different hours.</Text>

          {/* Time chips */}
          {scheduledTimes.length > 0 && (
            <View style={s.timeChipsRow}>
              {scheduledTimes.map((t, i) => (
                <View key={i} style={s.timeChip}>
                  <Text style={s.timeChipText}>{formatTimeLabel(t.date)}</Text>
                  <TouchableOpacity onPress={() => removeTime(i)} hitSlop={8}>
                    <CloseCircle size={14} color="#E53935" variant="Linear" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Start / End date */}
          <View style={s.datesRow}>
            <View style={s.dateField}>
              <Text style={s.fieldLabel}>Start Date</Text>
              <TouchableOpacity
                style={[s.dateInput, startDate ? s.dateInputFilled : undefined]}
                onPress={() => setShowStart(true)}
                activeOpacity={0.8}
              >
                <Text style={[s.dateText, !startDate && s.datePlaceholder]}>
                  {startDate ? formatDateDisplay(startDate) : 'mm/dd/yyyy'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={s.dateField}>
              <Text style={s.fieldLabel}>End Date</Text>
              <TouchableOpacity
                style={[s.dateInput, endDate ? s.dateInputFilled : undefined]}
                onPress={() => setShowEnd(true)}
                activeOpacity={0.8}
              >
                <Text style={[s.dateText, !endDate && s.datePlaceholder]}>
                  {endDate ? formatDateDisplay(endDate) : 'Optional'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Reminder */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>Reminder</Text>
            <View style={s.reminderRow}>
              {[5, 15, 30, 60].map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[s.reminderBtn, reminder === min && s.reminderBtnActive]}
                  onPress={() => setReminder(min)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.reminderBtnText, reminder === min && s.reminderBtnTextActive]}>
                    {min}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Frequency */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>Frequency</Text>
            <View style={s.freqRow}>
              {FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[s.freqBtn, frequency === f.value && s.freqBtnActive]}
                  onPress={() => setFrequency(f.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.freqBtnText, frequency === f.value && s.freqBtnTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>Priority</Text>
            <View style={s.priorityRow}>
              {(['LOW', 'NORMAL', 'HIGH'] as Priority[]).map((p) => (
                <TouchableOpacity key={p} style={s.radioRow} onPress={() => setPriority(p)} activeOpacity={0.7}>
                  <View style={[s.radio, priority === p && s.radioActive]}>
                    {priority === p && <View style={s.radioDot} />}
                  </View>
                  <Text style={s.radioLabel}>{p.charAt(0) + p.slice(1).toLowerCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Instructions */}
        <Text style={s.sectionLabelBold}>Instructions</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={instructions} onChangeText={setInstructions}
          placeholder="Take with food. Avoid caffeine..." placeholderTextColor="#C4C4C4"
          multiline numberOfLines={4} textAlignVertical="top"
        />

        <Text style={s.footerNote}>Parensure provides reminders only.</Text>

        <TouchableOpacity
          style={[s.continueBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.continueBtnText}>Save Medication</Text>}
        </TouchableOpacity>
      </ScrollView>

      <PickerSheetModal
        visible={showTimePicker} mode="time" value={currentTime} title="Select Time"
        onConfirm={(d) => { setCurrentTime(d); setShowTimePicker(false); }}
        onCancel={() => setShowTimePicker(false)}
      />
      <PickerSheetModal
        visible={showStart} mode="date" value={startDate ?? new Date()} title="Start Date"
        onConfirm={(d) => { setStartDate(d); setShowStart(false); }}
        onCancel={() => setShowStart(false)}
      />
      <PickerSheetModal
        visible={showEnd} mode="date" value={endDate ?? new Date()} title="End Date"
        onConfirm={(d) => { setEndDate(d); setShowEnd(false); }}
        onCancel={() => setShowEnd(false)}
      />
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F5F5F7',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', flex: 1 },

  progressTrack: { height: 3, backgroundColor: '#E5E7EB' },
  progressFill: { height: '100%', backgroundColor: '#E53935' },

  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  title: { fontSize: 26, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.5, marginBottom: 8, marginTop: 16 },
  subtitle: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 19, marginBottom: 24 },

  sectionLabel: {
    fontSize: 11, fontFamily: F.i.semiBold, color: '#9CA3AF',
    letterSpacing: 0.4, marginBottom: 14, marginTop: 8,
  },
  sectionLabelBold: {
    fontSize: 17, fontFamily: F.m.bold, color: '#111', marginBottom: 14, marginTop: 8,
  },
  subSectionLabel: { fontSize: 16, fontFamily: F.m.bold, color: '#111', marginBottom: 14 },

  label: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111', marginBottom: 8 },
  optional: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },
  input: {
    backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, fontFamily: F.i.regular, color: '#111',
    marginBottom: 16,
  },
  textArea: { minHeight: 100, paddingTop: 14, textAlignVertical: 'top' },

  // Intake method cards
  intakeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  intakeCard: {
    flex: 1, padding: 16, borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5, borderColor: 'transparent',
    gap: 6, position: 'relative',
  },
  intakeCardActive: { borderColor: '#E53935', backgroundColor: '#FFF' },
  intakeCheck: { position: 'absolute', top: 10, right: 10 },
  intakeCardTitle: { fontSize: 15, fontFamily: F.m.bold, color: '#374151', marginTop: 4 },
  intakeCardTitleActive: { color: '#E53935' },
  intakeCardDesc: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF', lineHeight: 15 },

  // ── Time section card (matches add-task / add-appointment) ──────────────────
  timeSectionCard: {
    backgroundColor: '#F9FAFB', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16, marginBottom: 24, gap: 4,
  },
  timeSectionTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.3, marginBottom: 16 },

  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontFamily: F.m.semiBold, color: '#374151', marginBottom: 8 },

  timeTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 18, paddingVertical: 16,
  },
  timeTriggerLeft: { gap: 2 },
  timeTriggerValue: { fontSize: 22, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.5 },
  timeTriggerHint: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF' },
  timeTriggerBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
  },
  timeTriggerBadgeText: { fontSize: 22 },

  addTimeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderColor: '#E53935',
    borderStyle: 'dashed', borderRadius: 10,
    paddingVertical: 12, marginTop: 4,
  },
  addTimeBtnText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },
  addTimeHint: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF', textAlign: 'center', marginTop: 6 },

  timeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: 50,
    borderWidth: 1, borderColor: '#FCA5A5',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  timeChipText: { fontSize: 12, fontFamily: F.m.semiBold, color: '#E53935' },

  datesRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  dateField: { flex: 1 },
  dateInput: {
    backgroundColor: '#FFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 12, paddingVertical: 12,
  },
  dateInputFilled: { borderColor: '#E53935', backgroundColor: '#FEF2F2' },
  dateText: { fontSize: 13, fontFamily: F.i.regular, color: '#111' },
  datePlaceholder: { color: '#C4C4C4' },

  reminderRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  reminderBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  reminderBtnActive: { backgroundColor: '#E53935', borderColor: '#E53935' },
  reminderBtnText: { fontSize: 12, fontFamily: F.m.semiBold, color: '#6B7280' },
  reminderBtnTextActive: { color: '#FFF' },

  freqRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  freqBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center',
  },
  freqBtnActive: { backgroundColor: '#E53935', borderColor: '#E53935' },
  freqBtnText: { fontSize: 12, fontFamily: F.m.semiBold, color: '#6B7280' },
  freqBtnTextActive: { color: '#FFF' },

  priorityRow: { flexDirection: 'row', gap: 20 },
  radioRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#E53935' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53935' },
  radioLabel: { fontSize: 13, fontFamily: F.m.medium, color: '#374151' },

  footerNote: {
    fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF',
    textAlign: 'center', marginBottom: 16, marginTop: 4,
  },
  continueBtn: {
    height: 56, borderRadius: 28,
    backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  continueBtnText: { fontSize: 16, fontFamily: F.m.bold, color: '#FFF' },
  noReceiversText: { fontSize: 14, fontFamily: F.i.regular, color: '#6B7280', padding: 24, textAlign: 'center' },
});

const dd = StyleSheet.create({
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#E9EAEC', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 16,
  },
  periodBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#E9EAEC', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    gap: 6, minWidth: 80,
  },
  value:       { fontSize: 14, fontFamily: F.i.regular, color: '#111' },
  placeholder: { color: '#9CA3AF' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: 400, paddingBottom: 32, paddingTop: 8,
  },
  sheetTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111', paddingHorizontal: 24, paddingVertical: 16 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 14,
  },
  optionActive:     { backgroundColor: '#FEF2F2' },
  optionText:       { fontSize: 15, fontFamily: F.i.regular, color: '#111' },
  optionTextActive: { color: '#E53935', fontFamily: F.m.semiBold },
});

const ps = StyleSheet.create({
  root:    { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  title:  { fontSize: 16, fontFamily: F.m.bold, color: '#111' },
  cancel: { fontSize: 15, fontFamily: F.m.medium, color: '#6B7280' },
  done:   { fontSize: 15, fontFamily: F.m.semiBold, color: '#E53935' },
  picker: { width: '100%', height: 200 },
});

