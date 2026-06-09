#!/usr/bin/env python
# -*- coding: utf-8 -*-

from database import get_db, fetch_all, fetch_one, load_rapports, get_stats

def test_connection():
    """Vérifie la connexion à la base de données"""
    print("[TEST] Tentative de connexion à la base de données...")
    try:
        conn = get_db()
        conn.close()
        print("✓ Connexion réussie")
        return True
    except Exception as e:
        print(f"✗ Erreur de connexion: {e}")
        return False

def test_tables():
    """Vérifie que les tables existent"""
    print("\n[TEST] Vérification des tables...")
    tables = ["dbo.Rapports", "dbo.Juges", "dbo.AnalyseIA", "dbo.AnalyseHistorique", "dbo.USERS"]
    for table in tables:
        try:
            result = fetch_one(f"SELECT COUNT(*) as cnt FROM {table}", [])
            count = result["cnt"] if result else 0
            print(f"  • {table}: {count} lignes")
        except Exception as e:
            print(f"  ✗ {table}: {e}")

def test_load_rapports():
    """Teste le chargement des rapports"""
    print("\n[TEST] Chargement des rapports de 2024...")
    try:
        rapports = load_rapports(2024)
        print(f"✓ {len(rapports)} rapports chargés")
        if rapports:
            r = rapports[0]
            print(f"  Premier: {r.get('nom_complet')} - Score: {r.get('score_total')}")
            print(f"  Sentiment: {r.get('sentiment_label')}, Cohérence: {r.get('coherence_statut')}")
    except Exception as e:
        print(f"✗ Erreur: {e}")

def test_get_stats():
    """Teste les statistiques"""
    print("\n[TEST] Récupération des statistiques...")
    try:
        stats = get_stats(2024)
        print(f"✓ Statistiques chargées:")
        for key, value in stats.items():
            print(f"  • {key}: {value}")
    except Exception as e:
        print(f"✗ Erreur: {e}")

def test_users():
    """Teste la table USERS"""
    print("\n[TEST] Vérification des utilisateurs...")
    try:
        users = fetch_all("SELECT nom FROM dbo.USERS", [])
        print(f"✓ {len(users)} utilisateurs trouvés:")
        for u in users:
            print(f"  • {u.get('nom')}")
    except Exception as e:
        print(f"✗ Erreur: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("TEST DE LA BASE DE DONNÉES CSPJ")
    print("=" * 60)
    
    if test_connection():
        test_tables()
        test_users()
        test_load_rapports()
        test_get_stats()
    
    print("\n" + "=" * 60)
    print("Tests terminés")
    print("=" * 60)
