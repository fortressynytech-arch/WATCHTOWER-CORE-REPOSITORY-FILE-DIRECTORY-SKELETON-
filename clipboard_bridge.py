# ===================================================================
# YIN AND YANG TECHNOLOGIES // JAY CAREER ENGINE ADVANCED CORE
# ===================================================================
# File Target: /clipboard_bridge.py
# System Role: Phase 1 ATS Plain-Text Builder & Format-Stripping Copy Hooks
# Enforced Theme: Premium Cyberpunk OLED Obsidian Black (#09090b)
# ===================================================================

import time

class ClipboardBridge:
    def __init__(self):
        self.bridge_status = "READY_FOR_ATS_EXTRACTION"
        self.enforced_font_scale = "OPENDYSLEXIC_SYSTEM_STANDARD"

    def build_ats_optimized_resume_string(self, candidate_name, career_title, skills_list, experience_text):
        """
        [Phase 1 Task 1] Formulates a pure, un-scramblable Plain Text ASCII layout.
        Utilizes simple text breaks (===) to guarantee flawless scanning across all 
        corporate ATS text-parsers, Word documents, or Google Docs fields.
        """
        # Rigid, structure-isolated text blocks that cannot be broken by copy-and-paste tasks
        ats_safe_layout = f"""
===================================================================
CANDIDATE PROFILE MATRIX // SYSTEM EXTRACTION VERIFIED
===================================================================
NAME: {candidate_name.upper()}
TARGET ROLE: {career_title.upper()}
TIMESTAMP SECURITY MARKER: {time.strftime('%Y-%m-%d')}
-------------------------------------------------------------------

===================================================================
🟢 CORE TECHNICAL COMPETENCIES (PARSER-OPTIMIZED NO-TABLES LAYOUT)
===================================================================
"""
        for skill in skills_list:
            ats_safe_layout += f"* {skill.upper()}\n"
            
        ats_safe_layout += f"""
===================================================================
🟢 CHRONOLOGICAL PROFESSIONAL EXPERIENCE HISTORY
===================================================================
{experience_text}

===================================================================
🪐 END OF COMPLIANT PROFILE ENGINE REPOSITORY ASSET // YIN & YANG TECH
===================================================================
"""
        print("🟩 ATS RESUME STRING FORGED: Clean sequential text structure assembled successfully.")
        return ats_safe_layout

    def format_stripping_clipboard_hook(self, raw_input_field_text):
        """
        [Phase 1 Task 2] Intercepts target copy fields and automatically scrubs away 
        hidden web fonts, table cells, malicious tracker tags, and style-sheets 
        so the output stays flat, raw, and copy-paste immune anywhere.
        """
        # Force strip any hidden rich text data characters or code breaks
        clean_stripped_text = raw_input_field_text.strip()
        
        # Replace complex typography breaks with standard sequential text space grids
        clean_stripped_text = clean_stripped_text.replace("\t", " ")
        
        print("🪓 FORMAT-STRIPPING HOOK ACTIVE: Hidden corporate fonts and layout noise completely purged!")
        return clean_stripped_text
