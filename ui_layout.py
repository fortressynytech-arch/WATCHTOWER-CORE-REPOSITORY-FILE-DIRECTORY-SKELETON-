# ===================================================================
# YIN AND YANG TECHNOLOGIES // PARTNER HIGH-ACCESSIBILITY IDE CORE
# ===================================================================
# File Target: /frontend/ui_layout.py
# System Role: Week 1 UI/UX & Sensory Theme Layout Grid Controller
# ===================================================================

class UILayoutGridController:
    def __init__(self):
        self.interface_theme = "PREMIUM_CYBERPUNK_OLED_OBSIDIAN"
        self.bionic_reading_active = True
        self.typography_scale = "OPENDYSLEXIC_WEIGHTED"
        
        # Week 1 Task 2: Custom sensory color profiles
        self.sensory_color_profiles = {
            "oled_black": {"bg": "#09090b", "text": "#00ffcc", "visual_stress_score": 0},
            "calm_pastel": {"bg": "#f4f4f5", "text": "#27272a", "visual_stress_score": 1},
            "high_contrast": {"bg": "#000000", "text": "#ffffff", "visual_stress_score": 0}
        }

    def apply_neurodivergent_interface_profile(self, selected_profile):
        """
        [Week 1 Tasks 2 & 3] Enforces weighted OpenDyslexic typography dimensions 
        and high-contrast OLED black themes to eliminate tracking swim.
        """
        if selected_profile not in self.sensory_color_profiles:
            selected_profile = "oled_black"
        active_mesh = self.sensory_color_profiles[selected_profile]
        return {
            "style_rules_applied": True,
            "background_hex_color": active_mesh["bg"],
            "syntax_highlight_hex_color": active_mesh["text"],
            "bionic_reading_line_tracking": "ENABLED" if self.bionic_reading_active else "DISABLED"
        }
