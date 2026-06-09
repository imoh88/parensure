import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { caregiverApi } from '@/lib/api/caregiver';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { appointmentCache } from '@/lib/utils/appointmentCache';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Add, ArrowDown2, ArrowLeft, CloseCircle, DocumentText, Location, TickCircle, Trash } from 'iconsax-react-native';
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

type Frequency = 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'CUSTOM';
type Priority = 'LOW' | 'NORMAL' | 'HIGH';

interface Receiver {
  id: string;
  careReceiverId: string;
  name: string;
}

interface ScheduledTime {
  date: Date;
}

function formatDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatTimeLabel(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
}

// ─── DateTimePicker bottom-sheet modal ────────────────────────────────────────
function PickerSheetModal({
  visible,
  mode,
  value,
  minimumDate,
  onConfirm,
  onCancel,
  title,
}: {
  visible: boolean;
  mode: 'date' | 'time';
  value: Date;
  minimumDate?: Date;
  onConfirm: (d: Date) => void;
  onCancel: () => void;
  title?: string;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => { if (visible) setDraft(value); }, [visible, value]);

  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={draft}
        mode={mode}
        display="default"
        minimumDate={minimumDate}
        onChange={(_e, d) => {
          if (d) onConfirm(d);
          else onCancel();
        }}
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
            value={draft}
            mode={mode}
            display="spinner"
            minimumDate={minimumDate}
            textColor="#000000"
            themeVariant="light"
            style={ps.picker}
            onChange={(_e, d) => { if (d) setDraft(d); }}
          />
        </View>
      </View>
    </Modal>
  );
}

const ps = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },
  cancel: { fontSize: 15, fontFamily: F.m.medium, color: '#6B7280' },
  done: { fontSize: 15, fontFamily: F.m.semiBold, color: '#E53935' },
  picker: { width: '100%', height: 200 },
});

// ─── Picker Modal (options list) ──────────────────────────────────────────────
function PickerModal<T extends string>({
  visible,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pm.backdrop} onPress={onClose}>
        <View style={pm.sheet}>
          {options.map((o) => (
            <TouchableOpacity
              key={o.value}
              style={[pm.option, selected === o.value && pm.optionActive]}
              onPress={() => { onSelect(o.value); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[pm.optionText, selected === o.value && pm.optionTextActive]}>
                {o.label}
              </Text>
              {selected === o.value && <TickCircle size={18} color="#E53935" variant="Linear" />}
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const pm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingVertical: 12, paddingBottom: 32 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  optionActive: { backgroundColor: '#FEF2F2' },
  optionText: { fontSize: 16, fontFamily: F.i.regular, color: '#111' },
  optionTextActive: { color: '#E53935', fontFamily: F.m.semiBold },
});

function parseTimeString(label: string): Date {
  const d = new Date();
  const parts = label.trim().split(' ');
  const period = parts[1] ?? 'AM';
  const [hStr, mStr] = (parts[0] ?? '8:00').split(':');
  let h = parseInt(hStr ?? '8', 10);
  const m = parseInt(mStr ?? '0', 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  d.setHours(h, m, 0, 0);
  return d;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddAppointmentScreen() {
  const router = useRouter();
  const { apptId } = useLocalSearchParams<{ apptId?: string }>();
  const isEditing = !!apptId;
  const { activeRole, selfCareReceiverId, user } = useAuthStore();
  const isCareReceiver = activeRole === 'CARE_RECEIVER';

  const existing = isEditing ? (appointmentCache.get() as any) : null;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [providerName, setProviderName] = useState(existing?.providerName ?? '');
  const [providerPhone, setProviderPhone] = useState(existing?.providerPhone ?? '');
  const [location, setLocation] = useState(existing?.location ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const [frequency, setFrequency] = useState<Frequency>((existing?.frequency as Frequency) ?? 'ONE_TIME');
  const [priority, setPriority] = useState<Priority>((existing?.priority as Priority) ?? 'NORMAL');
  const [reminder, setReminder] = useState<number>(existing?.reminderMinutes ?? 30);

  const [scheduledTimes, setScheduledTimes] = useState<ScheduledTime[]>(
    existing?.scheduledTimes?.map((t: string) => ({ date: parseTimeString(t) })) ?? []
  );
  const [startDate, setStartDate] = useState<Date | null>(
    existing?.startDate ? new Date(existing.startDate) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    existing?.endDate ? new Date(existing.endDate) : null
  );

  const defaultTime = new Date();
  defaultTime.setHours(8, 0, 0, 0);
  const [currentTime, setCurrentTime] = useState<Date>(defaultTime);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);

  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [selectedReceiverId, setSelectedReceiverId] = useState(existing?.careReceiverId ?? '');
  const [loadingReceivers, setLoadingReceivers] = useState(true);
  const [showReceiverPicker, setShowReceiverPicker] = useState(false);

  const [saving, setSaving] = useState(false);

  interface AttachedFile { name: string; key: string; }
  const [attachments, setAttachments] = useState<AttachedFile[]>(
    existing?.attachments?.map((key: string) => ({ name: key.split('/').pop() ?? key, key })) ?? []
  );
  const [uploadingFile, setUploadingFile] = useState(false);

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'application/msword',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const filename = asset.name;
    const mimeType = asset.mimeType ?? 'application/octet-stream';

    setUploadingFile(true);
    try {
      const urlRes = await caregiverApi.getAppointmentUploadUrl(filename, mimeType);
      if (!urlRes.success || !urlRes.data) throw new Error('Could not get upload URL');
      const { url, key } = urlRes.data;

      const fileData = await fetch(asset.uri);
      const blob = await fileData.blob();
      const s3Res = await fetch(url, {
        method: 'PUT', body: blob, headers: { 'Content-Type': mimeType },
      });
      if (!s3Res.ok) throw new Error(`Upload failed (${s3Res.status})`);

      setAttachments((prev) => [...prev, { name: filename, key }]);
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Could not upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = (key: string) =>
    setAttachments((prev) => prev.filter((a) => a.key !== key));

  const addTime = () => {
    const label = formatTimeLabel(currentTime);
    if (!scheduledTimes.find((t) => formatTimeLabel(t.date) === label)) {
      setScheduledTimes((prev) => [...prev, { date: currentTime }]);
    }
  };

  const removeTime = (i: number) => setScheduledTimes((prev) => prev.filter((_, idx) => idx !== i));

  const loadReceivers = useCallback(async () => {
    if (isCareReceiver) { setLoadingReceivers(false); return; }
    setLoadingReceivers(true);
    const list: Receiver[] = [];
    if (selfCareReceiverId) {
      list.push({
        id: 'self',
        careReceiverId: selfCareReceiverId,
        name: `${user?.fullName ?? 'Me'} (me)`,
      });
    }
    try {
      const res = await caregiverApi.getBookings();
      if (res.success && res.data) {
        const bookingList: Receiver[] = (res.data as any[])
          .filter((b) => b.careReceiver?.user)
          .map((b) => ({
            id: b.id,
            careReceiverId: b.careReceiverId,
            name: b.careReceiver?.user?.fullName ?? 'Unknown',
          }));
        list.push(...bookingList);
      }
    } catch {
      // silently fail
    } finally {
      setReceivers(list);
      if (list.length > 0 && list[0]) setSelectedReceiverId(list[0].careReceiverId);
      setLoadingReceivers(false);
    }
  }, [isCareReceiver, selfCareReceiverId, user?.fullName]);

  useEffect(() => { loadReceivers(); }, [loadReceivers]);

  const selectedReceiver = receivers.find((r) => r.careReceiverId === selectedReceiverId);
  const receiverOptions = receivers.map((r) => ({ label: r.name, value: r.careReceiverId }));

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter an appointment title.'); return; }
    if (!isCareReceiver && !selectedReceiverId) { Alert.alert('Required', 'Please select a care receiver.'); return; }

    setSaving(true);
    try {
      const timeLabels = scheduledTimes.map((t) => formatTimeLabel(t.date));
      const payload = {
        title: title.trim(),
        providerName: providerName.trim() || undefined,
        providerPhone: providerPhone.trim() || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        scheduledTimes: timeLabels,
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        reminderMinutes: reminder,
        frequency,
        priority,
        attachments: attachments.map((a) => a.key),
      };

      const res = isEditing
        ? await caregiverApi.updateAppointment(apptId!, payload)
        : await caregiverApi.createAppointment({ careReceiverId: selectedReceiverId, ...payload });

      if (res.success) {
        router.back();
      } else {
        Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} appointment. Please try again.`);
      }
    } catch {
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} appointment. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper bg="#FFFFFF">
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isEditing ? 'Edit Appointment' : 'Add Appointment'}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title block */}
        <View style={s.titleBlock}>
          <Text style={s.pageTitle}>{isEditing ? 'Edit Appointment' : 'Add New Appointment'}</Text>
          <Text style={s.pageSub}>{isEditing ? 'Update the details below and save.' : 'Schedule care and support for your loved one.'}</Text>
        </View>

        {/* Appointment Title */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Appointment Title</Text>
          <TextInput
            style={s.input}
            placeholder="e.g Monthly Checkup"
            placeholderTextColor="#C4C4C4"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Provider Name */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Provider Name</Text>
          <TextInput
            style={s.input}
            placeholder="e.g Dr. Smith"
            placeholderTextColor="#C4C4C4"
            value={providerName}
            onChangeText={setProviderName}
          />
        </View>

        {/* Provider Phone */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Provider Phone No. <Text style={s.optional}>(optional)</Text></Text>
          <TextInput
            style={s.input}
            placeholder="e.g +1 234 567 8900"
            placeholderTextColor="#C4C4C4"
            value={providerPhone}
            onChangeText={setProviderPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Location */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Location</Text>
          <View style={s.locationWrap}>
            <Location size={18} color="#E53935" variant="Linear" style={{ marginRight: 8 }} />
            <TextInput
              style={s.locationInput}
              placeholder="search a location"
              placeholderTextColor="#C4C4C4"
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </View>

        {/* Accompanied By */}
        {!isCareReceiver && (
          <View style={s.field}>
            <Text style={s.fieldLabel}>Accompanied By</Text>
            {loadingReceivers ? (
              <ActivityIndicator color="#E53935" style={{ marginTop: 8 }} />
            ) : receivers.length === 0 ? (
              <Text style={s.emptyText}>No care receivers in your care circle yet.</Text>
            ) : (
              <TouchableOpacity style={s.selector} onPress={() => setShowReceiverPicker(true)} activeOpacity={0.8}>
                <Text style={s.selectorText}>{selectedReceiver?.name ?? 'Select...'}</Text>
                <ArrowDown2 size={18} color="#9CA3AF" variant="Linear" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Notes */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Notes or special Instruction</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Add specific instructions or notes..."
            placeholderTextColor="#C4C4C4"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Dashed divider */}
        <View style={s.dashedDivider} />

        {/* Time & Duration Section */}
        <View style={s.timeSectionCard}>
          <Text style={s.sectionTitle}>Time & Duration</Text>

          {/* Time picker row */}
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
          <Text style={s.addTimeHint}>Add multiple times if needed.</Text>

          {/* Added time chips */}
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

          {/* Start / End Dates */}
          <View style={s.datesRow}>
            <View style={s.dateField}>
              <Text style={s.fieldLabel}>Start Date</Text>
              <TouchableOpacity
                style={[s.dateInput, startDate && s.dateInputFilled]}
                onPress={() => setShowStartDate(true)}
                activeOpacity={0.8}
              >
                <Text style={[s.dateText, !startDate && s.datePlaceholder]}>
                  {startDate ? formatDate(startDate) : 'mm/dd/yyyy'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={s.dateField}>
              <Text style={s.fieldLabel}>End Date</Text>
              <TouchableOpacity
                style={[s.dateInput, endDate && s.dateInputFilled]}
                onPress={() => setShowEndDate(true)}
                activeOpacity={0.8}
              >
                <Text style={[s.dateText, !endDate && s.datePlaceholder]}>
                  {endDate ? formatDate(endDate) : 'Optional'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Reminder */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>Reminder (minutes before)</Text>
            <View style={s.reminderRow}>
              {[15, 30, 60, 120].map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[s.reminderBtn, reminder === min && s.reminderBtnActive]}
                  onPress={() => setReminder(min)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.reminderBtnText, reminder === min && s.reminderBtnTextActive]}>
                    {min < 60 ? `${min}m` : `${min / 60}h`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Frequency */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>Frequency</Text>
            <View style={s.freqRow}>
              {(['ONE_TIME', 'DAILY', 'WEEKLY', 'CUSTOM'] as Frequency[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[s.freqBtn, frequency === f && s.freqBtnActive]}
                  onPress={() => setFrequency(f)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.freqBtnText, frequency === f && s.freqBtnTextActive]}>
                    {f === 'ONE_TIME' ? 'One-time' : f === 'DAILY' ? 'Daily' : f === 'WEEKLY' ? 'Weekly' : 'Custom'}
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
                <TouchableOpacity key={p} style={s.radioItem} onPress={() => setPriority(p)} activeOpacity={0.7}>
                  <View style={[s.radio, priority === p && s.radioActive]}>
                    {priority === p && <View style={s.radioDot} />}
                  </View>
                  <Text style={s.radioLabel}>{p[0] + p.slice(1).toLowerCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Attachment */}
        <View style={s.attachBox}>
          <DocumentText size={32} color="#D1D5DB" variant="Linear" />
          <Text style={s.attachTitle}>Add an attachment</Text>
          <Text style={s.attachSub}>Add photos, medical reports, or documents (Max 10MB)</Text>
          <TouchableOpacity
            style={[s.chooseFileBtn, uploadingFile && { opacity: 0.6 }]}
            onPress={handlePickFile}
            disabled={uploadingFile}
            activeOpacity={0.8}
          >
            <Text style={s.chooseFileText}>{uploadingFile ? 'Uploading…' : 'Choose File'}</Text>
          </TouchableOpacity>

          {attachments.length > 0 && (
            <View style={s.attachList}>
              {attachments.map((a) => (
                <View key={a.key} style={s.attachChip}>
                  <DocumentText size={14} color="#E53935" variant="Linear" />
                  <Text style={s.attachChipText} numberOfLines={1}>{a.name}</Text>
                  <TouchableOpacity onPress={() => removeAttachment(a.key)} hitSlop={8}>
                    <Trash size={14} color="#9CA3AF" variant="Linear" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnText}>{isEditing ? 'Update Appointment' : 'Save Appointment'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Receiver picker */}
      <PickerModal
        visible={showReceiverPicker}
        options={receiverOptions}
        selected={selectedReceiverId}
        onSelect={(v) => setSelectedReceiverId(v)}
        onClose={() => setShowReceiverPicker(false)}
      />

      <PickerSheetModal
        visible={showTimePicker}
        mode="time"
        value={currentTime}
        title="Select Time"
        onConfirm={(d) => { setCurrentTime(d); setShowTimePicker(false); }}
        onCancel={() => setShowTimePicker(false)}
      />

      <PickerSheetModal
        visible={showStartDate}
        mode="date"
        value={startDate ?? new Date()}
        title="Start Date"
        onConfirm={(d) => { setStartDate(d); setShowStartDate(false); }}
        onCancel={() => setShowStartDate(false)}
      />

      <PickerSheetModal
        visible={showEndDate}
        mode="date"
        value={endDate ?? new Date()}
        minimumDate={startDate ?? undefined}
        title="End Date"
        onConfirm={(d) => { setEndDate(d); setShowEndDate(false); }}
        onCancel={() => setShowEndDate(false)}
      />
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFF',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },

  scroll: { paddingHorizontal: 20, paddingBottom: 60 },

  titleBlock: { marginTop: 20, marginBottom: 24, gap: 6 },
  pageTitle: { fontSize: 26, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.5 },
  pageSub: { fontSize: 14, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 21 },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontFamily: F.m.semiBold, color: '#374151', marginBottom: 8 },
  optional: { fontFamily: F.i.regular, color: '#9CA3AF' },

  input: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: F.i.regular, color: '#111',
  },
  textarea: { minHeight: 100, paddingTop: 14 },

  locationWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 14,
  },
  locationInput: { flex: 1, fontSize: 15, fontFamily: F.i.regular, color: '#111', padding: 0 },

  selector: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectorText: { fontSize: 15, fontFamily: F.i.regular, color: '#111' },
  emptyText: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF', marginTop: 8 },

  dashedDivider: {
    borderBottomWidth: 1, borderColor: '#E5E7EB',
    borderStyle: 'dashed', marginBottom: 20,
  },

  timeSectionCard: {
    backgroundColor: '#F9FAFB', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16, marginBottom: 24, gap: 4,
  },
  timeSectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  sectionTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.3, marginBottom: 16 },

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

  datesRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dateField: { flex: 1 },
  dateInput: {
    backgroundColor: '#FFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 12, paddingVertical: 12,
  },
  dateText: { fontSize: 13, fontFamily: F.i.regular, color: '#111' },
  dateInputFilled: { borderColor: '#E53935', backgroundColor: '#FEF2F2' },
  datePlaceholder: { color: '#C4C4C4' },

  reminderRow: { flexDirection: 'row', gap: 8 },
  reminderBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  reminderBtnActive: { backgroundColor: '#E53935', borderColor: '#E53935' },
  reminderBtnText: { fontSize: 12, fontFamily: F.m.semiBold, color: '#6B7280' },
  reminderBtnTextActive: { color: '#FFF' },

  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  freqBtnActive: { backgroundColor: '#E53935', borderColor: '#E53935' },
  freqBtnText: { fontSize: 12, fontFamily: F.m.semiBold, color: '#6B7280' },
  freqBtnTextActive: { color: '#FFF' },

  priorityRow: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  radioItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#E53935' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53935' },
  radioLabel: { fontSize: 13, fontFamily: F.i.regular, color: '#374151' },

  attachBox: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed',
    borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 8, marginBottom: 28,
  },
  attachTitle: { fontSize: 15, fontFamily: F.m.bold, color: '#111' },
  attachSub: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  chooseFileBtn: {
    marginTop: 4, paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB',
  },
  chooseFileText: { fontSize: 13, fontFamily: F.m.semiBold, color: '#374151' },

  attachList: { width: '100%', gap: 8, marginTop: 4 },
  attachChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 8,
    borderWidth: 1, borderColor: '#FCA5A5',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  attachChipText: { flex: 1, fontSize: 12, fontFamily: F.m.semiBold, color: '#E53935' },

  saveBtn: {
    backgroundColor: '#E53935', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  saveBtnText: { color: '#FFF', fontFamily: F.m.bold, fontSize: 16 },

  cancelBtn: {
    borderRadius: 50, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#E53935',
  },
  cancelBtnText: { color: '#E53935', fontFamily: F.m.semiBold, fontSize: 15 },
});
