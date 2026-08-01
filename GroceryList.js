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
const BUDGET_KEY = 'eleanor_grocery_budget_v1';
const ALLERGENS_KEY = 'eleanor_grocery_allergens_v1';
const CUSTOM_ALLERGENS_KEY = 'eleanor_grocery_custom_allergens_v1';
const DEFAULT_STORES = ['Walmart', "Sam's Club"];

// Common additive names that hide sodium, potassium, or phosphorus in
// ingredient lists. This is a plain keyword match against text you paste in
// — it does not judge whether a food is safe, just flags where these terms
// appear so you can check them yourself.
const HIDDEN_ADDITIVES = {
  Phosphorus: [
    'phosphate', 'phosphoric acid', 'pyrophosphate', 'polyphosphate',
    'phosphorus', 'tricalcium phosphate', 'sodium phosphate',
    'calcium phosphate', 'disodium phosphate',
  ],
  Sodium: [
    'sodium', 'disodium', 'monosodium', 'sodium bicarbonate',
    'sodium benzoate', 'sodium nitrate', 'sodium citrate', 'brine', 'cured',
  ],
  Potassium: [
    'potassium', 'potassium chloride', 'potassium sorbate',
    'potassium benzoate', 'potassium bicarbonate',
  ],
};

// Covers gluten plus the 9 allergens the FDA recognizes as the most common
// serious food allergens in the US, so you don't have to remember to add
// each one yourself. Still just keyword matching — not exhaustive, and it
// can miss uncommon names, other languages, or "may contain" statements.
const ALLERGEN_TERMS = {
  Gluten: [
    'wheat', 'barley', 'rye', 'malt', 'gluten', 'triticale',
    'wheat flour', 'wheat starch',
  ],
  Milk: [
    'milk', 'dairy', 'whey', 'casein', 'lactose', 'butter', 'cream',
    'cheese', 'ghee', 'buttermilk',
  ],
  Eggs: ['egg', 'eggs', 'albumin', 'ovalbumin', 'egg white', 'egg yolk'],
  Fish: [
    'fish', 'anchovy', 'anchovies', 'fish sauce', 'surimi', 'cod', 'salmon',
    'tuna', 'tilapia',
  ],
  Shellfish: [
    'shrimp', 'crab', 'lobster', 'prawn', 'crawfish', 'crayfish',
    'shellfish',
  ],
  'Tree Nuts': [
    'almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut',
    'macadamia', 'brazil nut', 'tree nut', 'pine nut',
  ],
  Peanut: ['peanut', 'peanuts', 'groundnut', 'groundnuts', 'peanut oil'],
  Wheat: ['wheat', 'wheat flour', 'wheat starch', 'whole wheat', 'semolina'],
  Soy: ['soy', 'soybean', 'soy lecithin', 'soy protein', 'edamame'],
  Sesame: ['sesame', 'sesame oil', 'sesame seed', 'tahini'],
};

const ALL_ALLERGENS = Object.keys(ALLERGEN_TERMS);

// A small built-in reference for allergies/issues beyond the FDA "big 9" —
// used only to suggest a starting list of hidden names when you type one of
// these in. Not exhaustive, and you can edit the suggested terms before
// saving.
const REFERENCE_ALLERGEN_SUGGESTIONS = {
  corn: ['corn', 'corn syrup', 'cornstarch', 'corn starch', 'dextrose', 'maltodextrin', 'corn oil', 'zein'],
  mustard: ['mustard', 'mustard seed', 'mustard powder', 'mustard oil'],
  sulfites: ['sulfite', 'sulphite', 'sulfur dioxide', 'sodium sulfite', 'sodium bisulfite', 'potassium bisulfite', 'potassium metabisulfite'],
  celery: ['celery', 'celery seed', 'celery salt', 'celeriac'],
  lupin: ['lupin', 'lupine', 'lupin flour'],
  mollusks: ['mollusk', 'mollusc', 'clam', 'mussel', 'oyster', 'scallop', 'squid', 'octopus', 'snail'],
  coconut: ['coconut', 'coconut oil', 'coconut milk'],
  citrus: ['citrus', 'orange', 'lemon', 'lime', 'grapefruit', 'citric acid'],
  nightshades: ['tomato', 'potato', 'eggplant', 'pepper', 'paprika', 'nightshade'],
};

function lookupAllergenSuggestion(name) {
  const key = name.trim().toLowerCase();
  return REFERENCE_ALLERGEN_SUGGESTIONS[key] || null;
}

// A small built-in reference for common food ingredient/additive terms.
// Definitions describe what something is or what it's typically used for —
// not whether it's good or bad for any particular person. Not exhaustive.
const INGREDIENT_GLOSSARY = {
  'xanthan gum': 'A thickener/stabilizer made by fermenting sugar with bacteria. Common in gluten-free baking and sauces.',
  'carrageenan': 'A thickener derived from red seaweed, often used in dairy and plant-milk products.',
  'msg': 'Monosodium glutamate, a flavor enhancer that adds savory (umami) taste. Contains sodium.',
  'monosodium glutamate': 'A flavor enhancer that adds savory (umami) taste. Contains sodium.',
  'high fructose corn syrup': 'A sweetener made from corn starch, common in processed foods and drinks.',
  'citric acid': 'A naturally occurring acid (also made synthetically) used as a preservative and for tartness.',
  'sodium benzoate': 'A preservative that prevents mold and bacteria growth, commonly in acidic foods and drinks.',
  'potassium sorbate': 'A preservative used to prevent mold, yeast, and fungus growth.',
  'sodium nitrate': 'A preservative and color-fixer commonly used in cured/processed meats.',
  'red 40': 'A synthetic food dye (Allura Red) used to add red coloring.',
  'yellow 5': 'A synthetic food dye (Tartrazine) used to add yellow coloring.',
  'natural flavors': 'A broad legal term for flavoring derived from a plant or animal source. The exact source is not required to be disclosed.',
  'artificial flavors': 'A broad legal term for flavoring made from synthetic compounds rather than natural sources.',
  'soy lecithin': 'An emulsifier derived from soybeans, used to help mix ingredients like oil and water.',
  'guar gum': 'A thickener derived from guar beans, common in gluten-free products and ice cream.',
  'maltodextrin': 'A starch-derived carbohydrate used as a thickener or filler. Can be made from corn, wheat, potato, or rice.',
  'dextrose': 'A form of sugar (glucose) often used as a sweetener or filler.',
  'modified food starch': 'A starch (from corn, wheat, potato, etc.) chemically altered to thicken or stabilize food.',
  'calcium propionate': 'A preservative commonly used in bread to prevent mold.',
  'bha': 'Butylated hydroxyanisole, a synthetic preservative used to keep fats from spoiling.',
  'bht': 'Butylated hydroxytoluene, a synthetic preservative used to keep fats from spoiling.',
};

function lookupIngredient(term) {
  const key = term.trim().toLowerCase();
  if (!key) return null;
  if (INGREDIENT_GLOSSARY[key]) return INGREDIENT_GLOSSARY[key];
  // fall back to partial match
  const match = Object.keys(INGREDIENT_GLOSSARY).find(
    (k) => k.includes(key) || key.includes(k)
  );
  return match ? INGREDIENT_GLOSSARY[match] : undefined;
}

function scanIngredients(text, allergenTermsMap, activeAllergens) {
  const lower = text.toLowerCase();
  const found = {};
  Object.entries(HIDDEN_ADDITIVES).forEach(([nutrient, terms]) => {
    const matches = terms.filter((t) => lower.includes(t));
    if (matches.length > 0) found[nutrient] = matches;
  });
  const allergenHits = {};
  Object.entries(allergenTermsMap).forEach(([allergen, terms]) => {
    if (activeAllergens && !activeAllergens[allergen]) return;
    const matches = terms.filter((t) => lower.includes(t));
    if (matches.length > 0) allergenHits[allergen] = matches;
  });
  return { nutrients: found, allergens: allergenHits };
}

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
  const [budget, setBudget] = useState('');
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [newItemSodium, setNewItemSodium] = useState('');
  const [newItemPotassium, setNewItemPotassium] = useState('');
  const [newItemPhosphorus, setNewItemPhosphorus] = useState('');
  const [showNutritionFields, setShowNutritionFields] = useState(false);
  const [showIngredientCheck, setShowIngredientCheck] = useState(false);
  const [ingredientText, setIngredientText] = useState('');
  const [scanResults, setScanResults] = useState(null);
  const [activeAllergens, setActiveAllergens] = useState(
    Object.fromEntries(ALL_ALLERGENS.map((a) => [a, true]))
  );
  const [customAllergens, setCustomAllergens] = useState({});
  const [showAddAllergen, setShowAddAllergen] = useState(false);
  const [newAllergenName, setNewAllergenName] = useState('');
  const [newAllergenTerms, setNewAllergenTerms] = useState('');
  const [allergenLookupNote, setAllergenLookupNote] = useState('');
  const [glossaryTerm, setGlossaryTerm] = useState('');
  const [glossaryResult, setGlossaryResult] = useState(undefined);

  // Load saved data on mount
  useEffect(() => {
    (async () => {
      try {
        const savedItems = await AsyncStorage.getItem(STORAGE_KEY);
        const savedStores = await AsyncStorage.getItem(STORES_KEY);
        const savedBudget = await AsyncStorage.getItem(BUDGET_KEY);
        const savedAllergens = await AsyncStorage.getItem(ALLERGENS_KEY);
        const savedCustom = await AsyncStorage.getItem(CUSTOM_ALLERGENS_KEY);
        if (savedItems) setItems(JSON.parse(savedItems));
        if (savedStores) setStores(JSON.parse(savedStores));
        if (savedBudget) setBudget(savedBudget);
        if (savedAllergens) setActiveAllergens(JSON.parse(savedAllergens));
        if (savedCustom) setCustomAllergens(JSON.parse(savedCustom));
      } catch (e) {
        console.warn('Failed to load grocery data', e);
      }
    })();
  }, []);

  const toggleAllergen = async (name) => {
    const next = { ...activeAllergens, [name]: !activeAllergens[name] };
    setActiveAllergens(next);
    try {
      await AsyncStorage.setItem(ALLERGENS_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save allergen settings', e);
    }
  };

  const runAllergenLookup = () => {
    const suggestion = lookupAllergenSuggestion(newAllergenName);
    if (suggestion) {
      setNewAllergenTerms(suggestion.join(', '));
      setAllergenLookupNote(
        `Found a built-in suggestion for "${newAllergenName.trim()}" — edit the terms below if needed.`
      );
    } else {
      setAllergenLookupNote(
        `No built-in reference for "${newAllergenName.trim()}". Type the specific ingredient names you want flagged, separated by commas.`
      );
    }
  };

  const saveCustomAllergen = async () => {
    const name = newAllergenName.trim();
    const terms = newAllergenTerms
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (!name || terms.length === 0) return;
    const nextCustom = { ...customAllergens, [name]: terms };
    const nextActive = { ...activeAllergens, [name]: true };
    setCustomAllergens(nextCustom);
    setActiveAllergens(nextActive);
    try {
      await AsyncStorage.setItem(
        CUSTOM_ALLERGENS_KEY,
        JSON.stringify(nextCustom)
      );
      await AsyncStorage.setItem(ALLERGENS_KEY, JSON.stringify(nextActive));
    } catch (e) {
      console.warn('Failed to save custom allergen', e);
    }
    setNewAllergenName('');
    setNewAllergenTerms('');
    setAllergenLookupNote('');
    setShowAddAllergen(false);
  };

  const saveBudget = async (val) => {
    setBudget(val);
    try {
      await AsyncStorage.setItem(BUDGET_KEY, val);
    } catch (e) {
      console.warn('Failed to save budget', e);
    }
  };

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
      prices: {},
      nutrition: {
        sodium: newItemSodium.trim() || null,
        potassium: newItemPotassium.trim() || null,
        phosphorus: newItemPhosphorus.trim() || null,
      },
    };
    persistItems([item, ...items]);
    setNewItemName('');
    setNewItemTags('');
    setNewItemSodium('');
    setNewItemPotassium('');
    setNewItemPhosphorus('');
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

  // Sum of the cheapest logged price for every item still needed (not yet "have")
  const estimatedTotal = items.reduce((sum, item) => {
    if (item.have) return sum;
    const best = cheapestStore(item.prices);
    return best ? sum + best[1] : sum;
  }, 0);

  const itemsMissingPrices = items.filter(
    (i) => !i.have && Object.keys(i.prices || {}).length === 0
  ).length;

  const budgetNum = parseFloat(budget);
  const hasBudget = !isNaN(budgetNum) && budgetNum > 0;
  const remaining = hasBudget ? budgetNum - estimatedTotal : null;
  const overBudget = hasBudget && remaining < 0;

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
          {item.nutrition &&
            (item.nutrition.sodium ||
              item.nutrition.potassium ||
              item.nutrition.phosphorus) && (
              <Text style={styles.nutritionText}>
                {item.nutrition.sodium ? `Na: ${item.nutrition.sodium}mg  ` : ''}
                {item.nutrition.potassium ? `K: ${item.nutrition.potassium}mg  ` : ''}
                {item.nutrition.phosphorus ? `P: ${item.nutrition.phosphorus}mg` : ''}
              </Text>
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

      <TouchableOpacity
        style={[styles.budgetBar, overBudget && styles.budgetBarOver]}
        onPress={() => setShowBudgetEdit(true)}
      >
        {hasBudget ? (
          <>
            <Text style={styles.budgetLine}>
              Budget: ${budgetNum.toFixed(2)}
            </Text>
            <Text style={styles.budgetLine}>
              Est. total: ${estimatedTotal.toFixed(2)}
            </Text>
            <Text
              style={[
                styles.budgetLine,
                styles.budgetRemaining,
                overBudget && styles.budgetRemainingOver,
              ]}
            >
              {overBudget
                ? `Over by $${Math.abs(remaining).toFixed(2)}`
                : `Remaining: $${remaining.toFixed(2)}`}
            </Text>
          </>
        ) : (
          <Text style={styles.budgetLine}>
            Tap to set your budget for this trip
          </Text>
        )}
        {itemsMissingPrices > 0 && (
          <Text style={styles.budgetNote}>
            {itemsMissingPrices} item{itemsMissingPrices !== 1 ? 's' : ''}{' '}
            still need a price logged
          </Text>
        )}
      </TouchableOpacity>

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
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setShowNutritionFields(!showNutritionFields)}
      >
        <Text style={styles.linkButtonText}>
          {showNutritionFields ? '− Hide' : '+ Add'} nutrition info (from label)
        </Text>
      </TouchableOpacity>

      {showNutritionFields && (
        <View style={styles.nutritionRow}>
          <TextInput
            style={styles.nutritionInput}
            placeholder="Sodium mg"
            placeholderTextColor="#888"
            keyboardType="decimal-pad"
            value={newItemSodium}
            onChangeText={setNewItemSodium}
          />
          <TextInput
            style={styles.nutritionInput}
            placeholder="Potassium mg"
            placeholderTextColor="#888"
            keyboardType="decimal-pad"
            value={newItemPotassium}
            onChangeText={setNewItemPotassium}
          />
          <TextInput
            style={styles.nutritionInput}
            placeholder="Phosphorus mg"
            placeholderTextColor="#888"
            keyboardType="decimal-pad"
            value={newItemPhosphorus}
            onChangeText={setNewItemPhosphorus}
          />
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={addItem}>
        <Text style={styles.addButtonText}>Add Item</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.checkIngredientsButton}
        onPress={() => {
          setScanResults(null);
          setIngredientText('');
          setShowIngredientCheck(true);
        }}
      >
        <Text style={styles.checkIngredientsText}>
          🔍 Check an Ingredient List
        </Text>
      </TouchableOpacity>
      <Text style={styles.smallDisclaimer}>
        Info only, not professional advice — always double-check labels.
      </Text>

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

      {/* Ingredient checker modal */}
      <Modal visible={showIngredientCheck} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Check an Ingredient List</Text>
            <Text style={styles.disclaimerText}>
              ⚠️ These are suggestions based on simple text matching, not
              professional or medical advice. This tool does not replace
              actually reading the physical package label — it can miss
              things, misspellings, or "may contain" statements. Always
              verify yourself.
            </Text>

            <Text style={styles.modalSubtext}>
              Watching for (tap to turn on/off — covers gluten plus the 9
              major FDA-recognized food allergens, plus anything custom you
              add):
            </Text>
            <View style={styles.allergenToggleRow}>
              {[...ALL_ALLERGENS, ...Object.keys(customAllergens)].map(
                (name) => (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.allergenChip,
                      activeAllergens[name] && styles.allergenChipActive,
                    ]}
                    onPress={() => toggleAllergen(name)}
                  >
                    <Text
                      style={[
                        styles.allergenChipText,
                        activeAllergens[name] && styles.allergenChipTextActive,
                      ]}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                )
              )}
              <TouchableOpacity
                style={styles.addAllergenChip}
                onPress={() => setShowAddAllergen(!showAddAllergen)}
              >
                <Text style={styles.addAllergenChipText}>
                  {showAddAllergen ? '− Cancel' : '+ Add custom'}
                </Text>
              </TouchableOpacity>
            </View>

            {showAddAllergen && (
              <View style={styles.addAllergenForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Name (e.g. corn, sulfites, coconut)"
                  placeholderTextColor="#888"
                  value={newAllergenName}
                  onChangeText={(v) => {
                    setNewAllergenName(v);
                    setAllergenLookupNote('');
                  }}
                />
                <TouchableOpacity
                  style={styles.lookupButton}
                  onPress={runAllergenLookup}
                >
                  <Text style={styles.lookupButtonText}>
                    🔍 Look up hidden names
                  </Text>
                </TouchableOpacity>
                {allergenLookupNote ? (
                  <Text style={styles.lookupNote}>{allergenLookupNote}</Text>
                ) : null}
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder="Terms to flag, comma separated"
                  placeholderTextColor="#888"
                  value={newAllergenTerms}
                  onChangeText={setNewAllergenTerms}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={saveCustomAllergen}
                >
                  <Text style={styles.addButtonText}>Save Custom Issue</Text>
                </TouchableOpacity>
              </View>
            )}

            <TextInput
              style={[styles.input, styles.ingredientInput]}
              placeholder="Paste ingredients here..."
              placeholderTextColor="#888"
              multiline
              value={ingredientText}
              onChangeText={setIngredientText}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                setScanResults(
                  scanIngredients(
                    ingredientText,
                    { ...ALLERGEN_TERMS, ...customAllergens },
                    activeAllergens
                  )
                )
              }
            >
              <Text style={styles.addButtonText}>Scan</Text>
            </TouchableOpacity>

            {scanResults && (
              <ScrollView style={{ maxHeight: 180, marginTop: 12 }}>
                {Object.keys(scanResults.allergens).length > 0 && (
                  <View style={styles.allergenBlock}>
                    <Text style={styles.allergenHeader}>
                      ⚠️ Possible Allergen Terms Found
                    </Text>
                    {Object.entries(scanResults.allergens).map(
                      ([allergen, matches]) => (
                        <Text key={allergen} style={styles.allergenLine}>
                          {allergen}: {matches.join(', ')}
                        </Text>
                      )
                    )}
                  </View>
                )}

                {Object.keys(scanResults.nutrients).length > 0 && (
                  <View>
                    {Object.entries(scanResults.nutrients).map(
                      ([nutrient, matches]) => (
                        <View key={nutrient} style={styles.scanResultBlock}>
                          <Text style={styles.scanResultHeader}>
                            {nutrient}
                          </Text>
                          <Text style={styles.scanResultTerms}>
                            {matches.join(', ')}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                )}

                {Object.keys(scanResults.allergens).length === 0 &&
                  Object.keys(scanResults.nutrients).length === 0 && (
                    <Text style={styles.scanClear}>
                      No matches from your watched terms — but double-check
                      the label yourself, this tool can miss things.
                    </Text>
                  )}
              </ScrollView>
            )}

            <View style={styles.divider} />

            <Text style={styles.modalSubtext}>
              Not sure what an ingredient is? Type it below.
            </Text>
            <View style={styles.glossaryRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="e.g. xanthan gum"
                placeholderTextColor="#888"
                value={glossaryTerm}
                onChangeText={setGlossaryTerm}
                onSubmitEditing={() =>
                  setGlossaryResult(lookupIngredient(glossaryTerm))
                }
              />
              <TouchableOpacity
                style={styles.glossarySearchButton}
                onPress={() =>
                  setGlossaryResult(lookupIngredient(glossaryTerm))
                }
              >
                <Text style={styles.glossarySearchText}>Search</Text>
              </TouchableOpacity>
            </View>
            {glossaryResult !== undefined && (
              <Text style={styles.glossaryResultText}>
                {glossaryResult
                  ? glossaryResult
                  : "Not in this app's built-in list. Try checking with the manufacturer, a pharmacist, or your doctor/dietitian."}
              </Text>
            )}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowIngredientCheck(false)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Budget edit modal */}
      <Modal visible={showBudgetEdit} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Set Trip Budget</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 250 (monthly food budget)"
              placeholderTextColor="#888"
              keyboardType="decimal-pad"
              value={budget}
              onChangeText={setBudget}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowBudgetEdit(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={() => {
                  saveBudget(budget);
                  setShowBudgetEdit(false);
                }}
              >
                <Text style={styles.modalSaveText}>Save</Text>
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
  budgetBar: {
    backgroundColor: '#18181b',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2ee6a6',
  },
  budgetBarOver: { borderColor: '#e63946' },
  budgetLine: { color: '#fff', fontSize: 13, marginBottom: 2 },
  budgetRemaining: { fontWeight: 'bold', color: '#2ee6a6' },
  budgetRemainingOver: { color: '#e63946' },
  budgetNote: { color: '#e0a626', fontSize: 11, marginTop: 6 },
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
  linkButton: { marginBottom: 8 },
  linkButtonText: { color: '#2ee6a6', fontSize: 12 },
  nutritionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  nutritionInput: {
    flex: 1,
    backgroundColor: '#18181b',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 12,
  },
  nutritionText: { color: '#e0a626', fontSize: 11, marginTop: 4 },
  checkIngredientsButton: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  checkIngredientsText: { color: '#fff', fontSize: 13 },
  smallDisclaimer: {
    color: '#666',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  disclaimerText: {
    color: '#e0a626',
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 16,
    backgroundColor: '#2a2410',
    padding: 8,
    borderRadius: 6,
  },
  allergenBlock: {
    backgroundColor: '#2a1010',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#e63946',
  },
  allergenHeader: {
    color: '#ff8080',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 4,
  },
  allergenLine: { color: '#fff', fontSize: 12, marginTop: 2 },
  modalSubtext: { color: '#999', fontSize: 12, marginBottom: 10, lineHeight: 17 },
  allergenToggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  allergenChip: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  allergenChipActive: {
    backgroundColor: '#e63946',
    borderColor: '#e63946',
  },
  allergenChipText: { color: '#999', fontSize: 12 },
  allergenChipTextActive: { color: '#fff', fontWeight: 'bold' },
  addAllergenChip: {
    borderWidth: 1,
    borderColor: '#2ee6a6',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addAllergenChipText: { color: '#2ee6a6', fontSize: 12 },
  addAllergenForm: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  lookupButton: {
    backgroundColor: '#2a2a2e',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  lookupButtonText: { color: '#fff', fontSize: 12 },
  lookupNote: {
    color: '#e0a626',
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 14,
  },
  glossaryRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  glossarySearchButton: {
    backgroundColor: '#2ee6a6',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  glossarySearchText: { color: '#09090b', fontWeight: 'bold', fontSize: 12 },
  glossaryResultText: {
    color: '#ddd',
    fontSize: 13,
    lineHeight: 18,
    backgroundColor: '#18181b',
    padding: 10,
    borderRadius: 8,
  },
  ingredientInput: { height: 100, textAlignVertical: 'top' },
  scanClear: { color: '#2ee6a6', fontSize: 13 },
  scanResultBlock: { marginBottom: 10 },
  scanResultHeader: { color: '#e0a626', fontWeight: 'bold', fontSize: 13 },
  scanResultTerms: { color: '#ddd', fontSize: 12, marginTop: 2 },
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
