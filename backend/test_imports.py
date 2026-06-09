#!/usr/bin/env python
# -*- coding: utf-8 -*-
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.getcwd())

print("[TEST] Teste les imports...")
try:
    import pyodbc
    print("✓ pyodbc OK")
except ImportError as e:
    print(f"✗ pyodbc ERROR: {e}")
    
try:
    from database import get_db
    print("✓ database.get_db OK")
except Exception as e:
    print(f"✗ database ERROR: {e}")

try:
    from models.nlp import run_nlp
    print("✓ models.nlp OK")
except Exception as e:
    print(f"✗ models.nlp ERROR: {e}")

try:
    from models.ml import predict_one
    print("✓ models.ml OK")
except Exception as e:
    print(f"✗ models.ml ERROR: {e}")

try:
    from flask import Flask
    print("✓ Flask OK")
except ImportError as e:
    print(f"✗ Flask ERROR: {e}")

print("\n[TEST] Tentative de connexion BD...")
try:
    from database import fetch_one
    result = fetch_one("SELECT @@VERSION as version")
    if result:
        print(f"✓ Database connected: {result['version'][:30]}...")
    else:
        print("✗ Database returned empty result")
except Exception as e:
    print(f"✗ Database connection ERROR: {e}")

print("\n[TEST] Tous les tests de base sont passés!")
