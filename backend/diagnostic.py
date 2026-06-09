#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de diagnostic pour tester le pipeline d'analyse
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from database import get_db, fetch_all, fetch_one, load_rapports, get_stats, save_analyse
    from models.nlp import run_nlp
except ImportError as e:
    print(f"Erreur import: {e}")
    sys.exit(1)

def test_connection():
    """Teste la connexion à la base de données"""
    print("[TEST] Connexion à la base de données...")
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) AS cnt FROM dbo.Rapports")
        result = cur.fetchone()
        count = result[0] if result else 0
        conn.close()
        print(f"✓ Connexion OK - {count} rapports dans dbo.Rapports")
        return True
    except Exception as e:
        print(f"✗ Erreur de connexion: {e}")
        return False

def test_load_rapports():
    """Teste le chargement des rapports"""
    print("\n[TEST] Chargement des rapports...")
    try:
        rapports = load_rapports(2024)
        print(f"✓ {len(rapports)} rapports chargés")
        if rapports:
            r = rapports[0]
            print(f"  - Premier : {r.get('nom_complet')} | Score: {r.get('score_total')} | Analyse: {r.get('sentiment_label')}")
        return rapports
    except Exception as e:
        print(f"✗ Erreur: {e}")
        return []

def test_nlp(rapports):
    """Teste le NLP sur un rapport"""
    print("\n[TEST] Analyse NLP...")
    if not rapports:
        print("✗ Pas de rapports à analyser")
        return
    
    r = rapports[0]
    try:
        result = run_nlp(
            r.get("score_total", 0),
            r.get("note_obtenue", 0),
            r.get("points_evolution", 20),
            r.get("description_evaluation", "")
        )
        print(f"✓ NLP OK pour {r.get('nom_complet')}")
        print(f"  - Sentiment: {result.get('sentiment_label')}")
        print(f"  - Cohérence: {result.get('coherence_statut')} ({result.get('coherence_pct')}%)")
        print(f"  - Verdict: {result.get('verdict_texte')}")
        return result
    except Exception as e:
        print(f"✗ Erreur NLP: {e}")
        return None

def test_save_analyse(rapports, nlp_result):
    """Teste la sauvegarde d'une analyse"""
    print("\n[TEST] Sauvegarde analyse...")
    if not rapports or not nlp_result:
        print("✗ Pas de données à sauvegarder")
        return
    
    r = rapports[0]
    try:
        save_analyse(r["rapport_id"], r["juge_id"], 2024, nlp_result)
        print(f"✓ Sauvegarde OK pour rapport {r['rapport_id']}")
    except Exception as e:
        print(f"✗ Erreur sauvegarde: {e}")

def test_historique():
    """Teste la récupération de l'historique"""
    print("\n[TEST] Récupération historique...")
    try:
        rows = fetch_all("""
            SELECT COUNT(*) as cnt FROM dbo.AnalyseIA WHERE annee_evaluation = 2024
        """)
        if rows:
            count = rows[0].get('cnt', 0) if isinstance(rows[0], dict) else rows[0][0]
            print(f"✓ {count} analyses sauvegardées pour 2024")
        else:
            print("✗ Pas de résultats")
    except Exception as e:
        print(f"✗ Erreur: {e}")

def test_stats():
    """Teste les statistiques"""
    print("\n[TEST] Statistiques...")
    try:
        stats = get_stats(2024)
        print(f"✓ Stats OK:")
        print(f"  - Total juges: {stats.get('total_juges')}")
        print(f"  - Rapports: {stats.get('nb_rapports')}")
        print(f"  - Incohérents: {stats.get('nb_incoherents')}")
        print(f"  - Doute: {stats.get('nb_doute')}")
        print(f"  - Cohérents: {stats.get('nb_coherents')}")
    except Exception as e:
        print(f"✗ Erreur: {e}")

if __name__ == "__main__":
    print("=" * 70)
    print("DIAGNOSTIC DU PIPELINE D'ANALYSE CSPJ")
    print("=" * 70)
    
    if test_connection():
        rapports = test_load_rapports()
        nlp_result = test_nlp(rapports)
        test_save_analyse(rapports, nlp_result)
        test_historique()
        test_stats()
    
    print("\n" + "=" * 70)
    print("Diagnostic terminé")
    print("=" * 70)
