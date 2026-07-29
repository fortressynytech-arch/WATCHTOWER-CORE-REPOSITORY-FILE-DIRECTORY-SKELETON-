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
      await
