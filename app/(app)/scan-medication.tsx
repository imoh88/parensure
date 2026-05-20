import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { caregiverApi } from '@/lib/api/caregiver';
import { F } from '@/lib/fonts';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'iconsax-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ScanMedicationScreen() {
  const router = useRouter();
  const goBack = () => router.back();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Prefilled after "scan"
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [rxNumber, setRxNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [editingInstructions, setEditingInstructions] = useState(false);

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to scan medication.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.4 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      await runScan(result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
    }
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.4 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      await runScan(result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
    }
  };

  const runScan = async (uri: string, mimeType: string) => {
    setScanning(true);
    setScanned(false);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const result = await caregiverApi.scanMedication(base64, mimeType);
      const data = result.data;
      if (!data) throw new Error('No data returned from scan');
      setMedName(data.name);
      setDosage(data.dosage);
      setRxNumber(data.rxNumber);
      setInstructions(data.instructions);
      setScanned(true);
    } catch (e: any) {
      Alert.alert('Scan failed', e?.response?.data?.message ?? e?.message ?? 'Could not extract medication details.');
    } finally {
      setScanning(false);
    }
  };

  const handleConfirm = () => {
    router.push({
      pathname: '/(app)/add-medication-manual',
      params: {
        prefillName: medName,
        prefillDosage: dosage,
        prefillInstructions: instructions,
      },
    });
  };

  return (
    <ScreenWrapper bg="#F5F5F7" avoidKeyboard={false}>
      {/* Header */}
      <View style={[s.header]}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Scan Medication</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Camera preview area */}
        <View style={s.cameraBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s.cameraImage} resizeMode="cover" />
          ) : (
            <View style={s.cameraPlaceholder}>
              <Ionicons name="camera-outline" size={48} color="#9CA3AF" />
              <Text style={s.cameraPlaceholderText}>Tap to scan</Text>
            </View>
          )}

          {/* Scanner frame overlay */}
          <View style={s.frameOverlay} pointerEvents="none">
            <View style={s.frame} />
          </View>

          {/* Scanning indicator */}
          {scanning && (
            <View style={s.scanningOverlay}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={s.scanningText}>Scanning...</Text>
            </View>
          )}

          {/* Bottom label */}
          <View style={s.camLabel}>
            <Text style={s.camLabelText}>Scan medication package or label</Text>
          </View>

          {/* Camera action buttons */}
          <View style={s.camActions}>
            <TouchableOpacity style={s.camBtn} onPress={openCamera} activeOpacity={0.85}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={s.camBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.camBtn, s.camBtnSecondary]} onPress={openGallery} activeOpacity={0.85}>
              <Ionicons name="image-outline" size={20} color="#E53935" />
              <Text style={[s.camBtnText, { color: '#E53935' }]}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Verify details — shown after scan */}
        {scanned && (
          <View style={s.verifySection}>
            <Text style={s.verifyTitle}>Verify Details</Text>

            <Text style={s.label}>Medication Name</Text>
            <TextInput style={s.input} value={medName} onChangeText={setMedName} />

            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Dosage</Text>
                <TextInput style={s.input} value={dosage} onChangeText={setDosage} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>RX Number</Text>
                <TextInput style={s.input} value={rxNumber} onChangeText={setRxNumber} keyboardType="numeric" />
              </View>
            </View>

            <View style={s.instructionsHeader}>
              <Text style={s.label}>Instructions</Text>
              <TouchableOpacity onPress={() => setEditingInstructions(e => !e)} activeOpacity={0.7}>
                <Text style={s.editLink}>{editingInstructions ? 'Done' : 'Edit'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[s.input, s.textArea, { backgroundColor: '#FFF8F0' }]}
              value={instructions}
              onChangeText={setInstructions}
              multiline
              editable={editingInstructions}
              textAlignVertical="top"
            />

            {/* AI note */}
            <View style={s.aiNote}>
              <Ionicons name="information-circle-outline" size={18} color="#E53935" />
              <Text style={s.aiNoteText}>
                Artificial Intelligence has auto-filled these fields based on the scan. Please review and edit if necessary.
              </Text>
            </View>

            <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Text style={s.confirmBtnText}>Confirm &amp; Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#F5F5F7',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111' },

  scroll: { paddingBottom: 60 },

  cameraBox: {
    margin: 16, borderRadius: 20, overflow: 'hidden',
    height: 280, backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  cameraImage: { width: '100%', height: '100%' },
  cameraPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2D2D2D', gap: 12,
  },
  cameraPlaceholderText: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF' },

  frameOverlay: {
    position: 'absolute', inset: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  frame: {
    width: '65%', height: '60%',
    borderWidth: 2, borderColor: '#fff',
    borderRadius: 12,
  },

  scanningOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  scanningText: { fontSize: 15, fontFamily: F.m.semiBold, color: '#fff' },

  camLabel: {
    position: 'absolute', bottom: 56, left: 0, right: 0, alignItems: 'center',
  },
  camLabelText: {
    backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff',
    fontSize: 13, fontFamily: F.i.medium,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },

  camActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10, padding: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  camBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#E53935', borderRadius: 12, paddingVertical: 10,
  },
  camBtnSecondary: { backgroundColor: '#FFF' },
  camBtnText: { fontSize: 14, fontFamily: F.m.bold, color: '#fff' },

  verifySection: { paddingHorizontal: 20 },
  verifyTitle: { fontSize: 22, fontFamily: F.m.xBold, color: '#111', marginBottom: 20, letterSpacing: -0.3 },

  label: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111', marginBottom: 8 },
  input: {
    backgroundColor: '#B6B6B629', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, fontFamily: F.i.regular, color: '#111', marginBottom: 16,
  },
  textArea: { minHeight: 90, paddingTop: 14 },

  twoCol: { flexDirection: 'row', gap: 12 },

  instructionsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  editLink: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },

  aiNote: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#EBEBEB', borderRadius: 12, padding: 14, marginBottom: 20,
  },
  aiNoteText: { flex: 1, fontSize: 13, fontFamily: F.i.regular, color: '#555', lineHeight: 19 },

  confirmBtn: {
    height: 56, borderRadius: 28,
    backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E53935', shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 6, marginBottom: 8,
  },
  confirmBtnText: { fontSize: 16, fontFamily: F.m.bold, color: '#FFF' },
});
