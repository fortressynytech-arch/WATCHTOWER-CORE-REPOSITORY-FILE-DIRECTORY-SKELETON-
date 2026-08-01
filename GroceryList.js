import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'eleanor_grocery_items_v1';
const STORES_KEY = 'eleanor_grocery_stores_v1';
const DEFAULT_STORES = ['Walmart', "Sam's Club"];

export default function GroceryList() {
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState(DEFAULT_STORES);
  const [newItemName, setNewItemName] = useState('');
  const [newItemTags, setNewItemTags] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [priceModalItem, setPriceModalItem] = useState(null);
  const [priceInputs, setPriceInputs] = useState({});
  const [tagFilter, setTagFilter] = useState('');
  const [showAddStore, setShowAddStore] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    (async () => {
      try {
        const savedItems = await AsyncStorage.getItem(STORAGE_KEY);
        const savedStores = await AsyncStorage.getItem(STORES_KEY);
        if (savedItems) setItems(JSON.parse(savedItems));
        if (savedStores) setStores(JSON.parse(savedStores));
      } catch (e) {
        console.warn('Failed to load grocery data', e);
      }
    })();
  }, []);

  const persistItems = useCallback(async (next) => {
    setItems(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save items', e);
    }
  }, []);

  const persistStores = useCallback(async (next) => {
    setStores(next);
    try {
      await AsyncStorage.setItem(STORES_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save stores', e);
    }
  }, []);

  const addItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    const tags = newItemTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const item = {
      id: Date.now().toString(),
      name,
      tags,
      have: false,
      prices: {}, // { storeName: price }
    };
    persistItems([item, ...items]);
    setNewItemName('');
    setNewItemTags('');
  };

  const toggleHave = (id) => {
    persistItems(
      items.map((i) => (i.id === id ? { ...i, have: !i.have } : i))
    );
  };

  const removeItem = (id) => {
    persistItems(items.filter((i) => i.id !== id));
  };

  const addStore = () => {
    const name = newStoreName.trim();
    if (!name || stores.includes(name)) return;
    persistStores([...stores, name]);
    setNewStoreName('');
    setShowAddStore(false);
  };

  const openPriceModal = (item) => {
    setPriceModalItem(item);
    setPriceInputs(item.prices || {});
  };

  const savePrices = () => {
    if (!priceModalItem) return;
    const cleaned = {};
    Object.entries(priceInputs).forEach(([store, val]) => {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0) cleaned[store] = num;
    });
    persistItems(
      items.map((i) =>
        i.id === priceModalItem.id ? { ...i, prices: cleaned } : i
      )
    );
    setPriceModalItem(null);
  };

  const cheapestStore = (prices) => {
    const entries = Object.entries(prices || {});
    if (entries.length === 0) return null;
    return entries.reduce((best, cur) => (cur[1] < best[1] ? cur : best));
  };

  const filteredItems = tagFilter.trim()
    ? items.filter((i) =>
        i.tags.some((t) =>
          t.toLowerCase().includes(tagFilter.trim().toLowerCase())
        )
      )
    : items;

  const renderItem = ({ item }) => {
    const best = cheapestStore(item.prices);
    return (
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={[styles.checkbox, item.have && styles.checkboxChecked]}
          onPress={() => toggleHave(item.id)}
        />
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, item.have && styles.itemNameDone]}>
            {item.name}
          </Text>
          {item.tags.length > 0 && (
            <View style={styles.tagRow}>
              {item.tags.map((t) => (
                <View key={t} style={styles.tagChip}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
          {best ? (
            <Text style={styles.priceText}>
              Best: {best[0]} — ${best[1].toFixed(2)}
            </Text>
          ) : (
            <Text style={styles.priceTextMuted}>No prices logged</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.smallButton}
          onPress={() => openPriceModal(item)}
        >
          <Text style={styles.smallButtonText}>Prices</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => removeItem(item.id)}
        >
          <Text style={styles.deleteButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Grocery List</Text>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Item name"
          placeholderTextColor="#888"
          value={newItemName}
          onChangeText={setNewItemName}
          onSubmitEditing={addItem}
        />
      </View>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Tags (comma separated, e.g. low-sodium, gluten-free)"
          placeholderTextColor="#888"
          value={newItemTags}
          onChangeText={setNewItemTags}
          onSubmitEditing={addItem}
        />
      </View>
      <TouchableOpacity style={styles.addButton} onPress={addItem}>
        <Text style={styles.addButtonText}>Add Item</Text>
      </TouchableOpacity>

      <View style={styles.filterRow}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by tag..."
          placeholderTextColor="#888"
          value={tagFilter}
          onChangeText={setTagFilter}
        />
        <TouchableOpacity
          style={styles.storeButton}
          onPress={() => setShowAddStore(true)}
        >
          <Text style={styles.storeButtonText}>+ Store</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items yet — add one above.</Text>
        }
      />

      {/* Price entry modal */}
      <Modal visible={!!priceModalItem} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              Prices for {priceModalItem?.name}
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {stores.map((store) => (
                <View key={store} style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{store}</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="$0.00"
                    placeholderTextColor="#888"
                    keyboardType="decimal-pad"
                    value={
                      priceInputs[store] !== undefined
                        ? String(priceInputs[store])
                        : ''
                    }
                    onChangeText={(val) =>
                      setPriceInputs((prev) => ({ ...prev, [store]: val }))
                    }
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setPriceModalItem(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={savePrices}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add store modal */}
      <Modal visible={showAddStore} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add a Store</Text>
            <TextInput
              style={styles.input}
              placeholder="Store name (e.g. Kroger, Aldi)"
              placeholderTextColor="#888"
              value={newStoreName}
              onChangeText={setNewStoreName}
              onSubmitEditing={addStore}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowAddStore(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={addStore}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', padding: 16 },
  header: {
    color: '#2ee6a6',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  addRow: { marginBottom: 8 },
  input: {
    backgroundColor: '#18181b',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  addButton: {
    backgroundColor: '#2ee6a6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: { color: '#09090b', fontWeight: 'bold' },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  filterInput: {
    flex: 1,
    backgroundColor: '#18181b',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  storeButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  storeButtonText: { color: '#fff' },
  list: { paddingBottom: 40 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#2ee6a6',
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: '#2ee6a6' },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  itemNameDone: { textDecorationLine: 'line-through', color: '#666' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 6 },
  tagChip: {
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { color: '#2ee6a6', fontSize: 11 },
  priceText: { color: '#9ae6b4', fontSize: 12, marginTop: 4 },
  priceTextMuted: { color: '#666', fontSize: 12, marginTop: 4 },
  smallButton: {
    backgroundColor: '#2a2a2e',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  smallButtonText: { color: '#fff', fontSize: 12 },
  deleteButton: { padding: 6 },
  deleteButtonText: { color: '#e63946', fontSize: 16 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceLabel: { color: '#fff', fontSize: 14, flex: 1 },
  priceInput: {
    backgroundColor: '#09090b',
    color: '#fff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 10,
  },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: '#999' },
  modalSave: {
    backgroundColor: '#2ee6a6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalSaveText: { color: '#09090b', fontWeight: 'bold' },
});
