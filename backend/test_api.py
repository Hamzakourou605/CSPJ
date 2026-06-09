#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test simple des endpoints API sans Flask
"""

import sys
try:
    from database import get_stats, load_rapports
    from models.nlp import run_nlp
    
    print("[TEST] Imports OK\n")
    
    # Test 1: load_rapports
    print("=" * 70)
    print("TEST 1: load_rapports(2024)")
    print("=" * 70)
    rapports = load_rapports(2024)
    print(f"✓ Chargé {len(rapports)} rapports")
    if rapports:
        r = rapports[0]
        print(f"  Premier rapport: {r.get('nom_complet')}")
        print(f"  - Score: {r.get('score_total')}")
        print(f"  - Note: {r.get('note_obtenue')}")
        print(f"  - Description: {r.get('description_evaluation', '')[:50]}...")
        print(f"  - Sentiment label: {r.get('sentiment_label')}")
    
    # Test 2: Test NLP sur le premier rapport
    if rapports:
        print("\n" + "=" * 70)
        print("TEST 2: run_nlp() sur premier rapport")
        print("=" * 70)
        r = rapports[0]
        result = run_nlp(
            r.get("score_total", 0),
            r.get("note_obtenue", 0),
            r.get("points_evolution", 20),
            r.get("description_evaluation", "")
        )
        print(f"✓ NLP OK:")
        print(f"  - Sentiment: {result.get('sentiment_label')}")
        print(f"  - Score sentiment: {result.get('sentiment_score')}")
        print(f"  - Cohérence: {result.get('coherence_statut')} ({result.get('coherence_pct')}%)")
        print(f"  - Verdict: {result.get('verdict_texte')}")
    
    # Test 3: get_stats
    print("\n" + "=" * 70)
    print("TEST 3: get_stats(2024)")
    print("=" * 70)
    stats = get_stats(2024)
    print(f"✓ Stats OK:")
    print(f"  - Total juges: {stats.get('total_juges')}")
    print(f"  - Rapports: {stats.get('nb_rapports')}")
    print(f"  - Incohérents: {stats.get('nb_incoherents')}")
    print(f"  - Doute: {stats.get('nb_doute')}")
    print(f"  - Cohérents: {stats.get('nb_coherents')}")
    print(f"  - Positif: {stats.get('nb_positif')}")
    print(f"  - Négatif: {stats.get('nb_negatif')}")
    print(f"  - Neutre: {stats.get('nb_neutre')}")
    
    print("\n" + "=" * 70)
    print("TOUS LES TESTS OK ✓")
    print("=" * 70)

except Exception as e:
    import traceback
    print(f"\n✗ ERREUR: {e}")
    traceback.print_exc()
    sys.exit(1)
