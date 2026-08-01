import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from './supabaseClient';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    setMessage('');
    if (!email.trim() || !password) {
      setMessage('Enter your email and password.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (data.session) onAuthenticated(data.session);
  };

  const handleSignup = async () => {
    setMessage('');
    if (!email.trim() || !password || !householdName.trim()) {
      setMessage('Fill in your email, password, and a name for your household.');
      return;
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setLoading(false);
      setMessage(signUpError.message);
      return;
    }

    // If email confirmation is required, there won't be a session yet.
    if (!signUpData.session) {
      setLoading(false);
      setMessage(
        'Account created! Check your email to confirm, then come back and log in.'
      );
      setMode('login');
      return;
    }

    // We have a session immediately — set up the household.
    const userId = signUpData.user.id;

    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ name: householdName.trim() })
      .select()
      .single();

    if (householdError) {
      setLoading(false);
      setMessage('Account created, but household setup failed: ' + householdError.message);
      return;
    }

    const { error: memberError } = await supabase.from('household_members').insert({
      household_id: household.id,
      user_id: userId,
      role: 'owner',
    });

    if (memberError) {
      setLoading(false);
      setMessage('Account created, but linking to household failed: ' + memberError.message);
      return;
    }

    // Give the new household free-tier access to ELEANOR by default.
    await supabase.from('app_entitlements').insert({
      household_id: household.id,
      app_name: 'ELEANOR',
      tier: 'free',
      unlocked: true,
    });

    setLoading(false);
    onAuthenticated(signUpData.session);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>YIN & YANG TECHNOLOGIES</Text>
      <Text style={styles.subtitle}>
        {mode === 'login' ? 'Sign in to your household' : 'Create your household account'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {mode === 'signup' && (
        <TextInput
          style={styles.input}
          placeholder="Household name (e.g. The Smith Family)"
          placeholderTextColor="#888"
          value={householdName}
          onChangeText={setHouseholdName}
        />
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={mode === 'login' ? handleLogin : handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#09090b" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {mode === 'login' ? 'Sign In' : 'Create Household'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setMessage('');
          setMode(mode === 'login' ? 'signup' : 'login');
        }}
      >
        <Text style={styles.switchText}>
          {mode === 'login'
            ? "Don't have a household account? Create one"
            : 'Already have an account? Sign in'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#00ffcc',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 28,
  },
  input: {
    backgroundColor: '#18181b',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  message: {
    color: '#e0a626',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#00ffcc',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: { color: '#09090b', fontWeight: '900' },
  switchText: {
    color: '#2ee6a6',
    fontSize: 13,
    textAlign: 'center',
  },
});
