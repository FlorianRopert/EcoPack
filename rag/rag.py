import pandas as pd
import requests
import os

FICHIERS = [
    "/home/debian/data/01_Informations_ouvriers.xlsx",
    "/home/debian/data/02_Contrats_salaires.xlsx",
    "/home/debian/data/03_Notices_techniques_machines.xlsx",
    "/home/debian/data/04_Historique_maintenance.xlsx",
    "/home/debian/data/05_Stocks_expeditions.xlsx",
    "/home/debian/data/06_Rapports_qualite_NC.xlsx",
    "/home/debian/data/07_Comptes_utilisateurs_logs.xlsx",
    "/home/debian/data/08_Planning_equipes.xlsx",
    "/home/debian/data/09_Dossiers_personnel.xlsx",
]

def charger_donnees():
    chunks = []
    for fichier in FICHIERS:
        nom = os.path.basename(fichier)
        try:
            df = pd.read_excel(fichier)
            df = df.fillna("")
            for _, row in df.iterrows():
                texte = nom + " | "
                texte += " | ".join([str(col) + ": " + str(row[col]) for col in df.columns if row[col] != ""])
                chunks.append(texte)
            print(f"OK: {nom} ({len(df)} lignes)")
        except Exception as e:
            print(f"ERREUR: {nom} -> {e}")
    return chunks

def rechercher(question, chunks, n=2):
    q = question.lower()
    scores = []
    for chunk in chunks:
        mots = q.split()
        score = sum(1 for mot in mots if mot in chunk.lower())
        scores.append((score, chunk))
    scores.sort(reverse=True)
    return [c for _, c in scores[:n]]

def demander_ia(question, contexte):
    prompt = "Tu es un assistant Ecopack. Utilise ces donnees pour repondre :\n\n" + contexte + "\n\nQuestion : " + question + "\nReponds en francais de facon concise."
    r = requests.post("http://localhost:8080/v1/chat/completions",
        json={"messages": [{"role": "user", "content": prompt}], "max_tokens": 150})
    return r.json()["choices"][0]["message"]["content"]

print("Chargement des donnees...")
chunks = charger_donnees()
print(f"\n{len(chunks)} chunks prets\n")

while True:
    question = input("Question (q pour quitter) : ")
    if question.lower() == "q":
        break
    contexte = "\n".join(rechercher(question, chunks))
    reponse = demander_ia(question, contexte)
    print(f"\nReponse : {reponse}\n")
