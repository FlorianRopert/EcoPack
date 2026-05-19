import asyncio
import websockets
import json
import pandas as pd
import requests
import os

FICHIERS = [
    "/home/debian/EcoPack/rag/data/01_Informations_ouvriers.xlsx",
    "/home/debian/EcoPack/rag/data/02_Contrats_salaires.xlsx",
    "/home/debian/EcoPack/rag/data/03_Notices_techniques_machines.xlsx",
    "/home/debian/EcoPack/rag/data/04_Historique_maintenance.xlsx",
    "/home/debian/EcoPack/rag/data/05_Stocks_expeditions.xlsx",
    "/home/debian/EcoPack/rag/data/06_Rapports_qualite_NC.xlsx",
    "/home/debian/EcoPack/rag/data/07_Comptes_utilisateurs_logs.xlsx",
    "/home/debian/EcoPack/rag/data/08_Planning_equipes.xlsx",
    "/home/debian/EcoPack/rag/data/09_Dossiers_personnel.xlsx",
]

chunks = []

def charger_donnees():
    global chunks
    chunks = []
    for fichier in FICHIERS:
        if not os.path.exists(fichier):
            print(f"❌ Fichier non trouvé : {fichier}")
            continue
        nom = os.path.basename(fichier)
        try:
            df = pd.read_excel(fichier)
            df = df.fillna("")
            for _, row in df.iterrows():
                texte = nom + " | "
                texte += " | ".join([str(col) + ": " + str(row[col]) for col in df.columns if row[col] != ""])
                chunks.append(texte)
            print(f"✅ {nom} ({len(df)} lignes)")
        except Exception as e:
            print(f"❌ {nom} -> {e}")
    print(f"\n✅ {len(chunks)} chunks chargés\n")

def rechercher(question, n=3):
    if not chunks:
        return []
    q = question.lower()
    scores = []
    for chunk in chunks:
        mots = q.split()
        score = sum(1 for mot in mots if mot in chunk.lower())
        scores.append((score, chunk))
    scores.sort(reverse=True, key=lambda x: x[0])
    return [c for _, c in scores[:n]]

def demander_ia(question, contexte):
    try:
        prompt = "Tu es un assistant EcoPack. Utilise ces donnees pour repondre :\n\n" + contexte + "\n\nQuestion : " + question + "\nReponds en francais de facon concise."
        r = requests.post("http://localhost:8080/v1/chat/completions",
            json={"messages": [{"role": "user", "content": prompt}], "max_tokens": 200},
            timeout=30)
        return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Erreur IA: {str(e)}"

async def traiter_question(websocket):
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                question = data.get('question', '')

                if not question:
                    await websocket.send(json.dumps({"reponse": "Question vide"}))
                    continue

                contexte = "\n".join(rechercher(question))
                reponse = demander_ia(question, contexte)

                await websocket.send(json.dumps({"reponse": reponse}))
            except json.JSONDecodeError:
                await websocket.send(json.dumps({"reponse": "JSON invalide"}))
    except websockets.exceptions.ConnectionClosed:
        print("Connexion fermée")

async def main():
    print("Chargement des données...")
    charger_donnees()

    async with websockets.serve(traiter_question, "localhost", 8765):
        print("✅ Serveur WebSocket Python sur ws://localhost:8765")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())