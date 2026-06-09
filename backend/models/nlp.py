def run_nlp(score_total, note_obtenue, points_evolution, description):
    """
    Simule l'analyse NLP et calcule les métriques de cohérence.
    Retourne un dictionnaire avec les champs nécessaires pour l'enrichissement.
    """
    try:
        score_total = float(score_total)
        note_obtenue = float(note_obtenue)
        points_evolution = float(points_evolution)
    except (ValueError, TypeError):
        score_total = 0.0
        note_obtenue = 0.0
        points_evolution = 0.0

    # Simulated Sentiment Analysis
    description = str(description or "").lower()
    positive_words = ["ممتاز", "جيد", "متميز", "كفاءة", "التزام", "نزاهة", "bon", "excellent", "parfait", "مجد", "نجاح", "يحتذى", "حسن", "تفاني"]
    negative_words = [
    # Performance faible
    "ضعيف", "ضعف", "متذبذب", "غير مستقر", "ناقص", "سيء", "متوسط",
    
    #  Retards / problèmes de temps
    "تأخير", "تأخيرات", "تأخر", "بطء", "بطئ", "تراكم", "متأخر",
    
    #  Discipline / comportement
    "غياب", "عدم الانضباط", "سلوك غير مهني", "غير مهني",
    
    #  Problèmes graves
    "شكوك", "شك", "نزاهة مشكوك فيها", "غلظة", "تعالي",
    
    #  Erreurs professionnelles
    "أخطاء", "أخطاء متكررة", "ضعف التحليل", "ضعف في التعليل",
    
    # Cas extrêmes
    "كارثي", "كارثية", "ضعف واضح", "مشاكل", "سلبي",
    
    #  Expressions مركبة من بياناتك
    "تأخر متكرر", "عدم احترام", "ضعف في تدبير", "شكاوى",
    
    #  Français
    "mauvais", "faible", "insuffisant", "retard", "erreur", "problème"
]
    score_sent = 0.5
    for word in positive_words:
        if word in description:
            score_sent += 0.15
    for word in negative_words:
        if word in description:
            score_sent -= 0.15
    
    sentiment_score = max(0, min(1, score_sent))
    if sentiment_score >= 0.6:
        sentiment_label = "إيجابي"
    elif sentiment_score <= 0.4:
        sentiment_label = "سلبي"
    else:
        sentiment_label = "محايد"

    # Logic for Coherence
    # user's note_obtenue is usually out of 5. We multiply by 20 to map it to 100.
    note_norm = note_obtenue * 20
    gap = abs(score_total - note_norm)
    coherence_pct = 100 - gap
    
    # NLP Sentiment vs Score Check
    if sentiment_label == "إيجابي" and score_total < 50:
        coherence_pct -= 50
    elif sentiment_label == "سلبي" and score_total > 70:
        coherence_pct -= 50
        
    coherence_pct = max(0, min(100, coherence_pct))
    
    if coherence_pct >= 75:
        coherence_statut = "متسق"  # Consistent
    elif coherence_pct >= 50:
        coherence_statut = "شك"     # Doubt
    else:
        coherence_statut = "تناقض"  # Contradiction

    # Logic for NASAQ (example based on evolution)
    if points_evolution >= 28:
        nasaq_type = "السريع"
    elif points_evolution >= 24:
        nasaq_type = "المتوسط"
    else:
        nasaq_type = "الأقدمية"

    return {
        "sentiment_label": sentiment_label,
        "sentiment_score": sentiment_score,
        "coherence_statut": coherence_statut,
        "coherence_pct": round(coherence_pct, 1),
        "gap": gap,
        "nasaq_type": nasaq_type,
        "R_value": 0.0,
        "R_prime_value": 0.0,
        "M_value": 0.0,
        "prediction_finale": coherence_statut,
        "verdict_texte": f"تحليل تلقائي بناءً على البيانات. الحالة: {coherence_statut}"
    }
