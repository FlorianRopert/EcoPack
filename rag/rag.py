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

MOTS_CLES_FICHIERS = {
    "01_Informations_ouvriers": ["ouvrier", "employe", "personnel", "salarie", "ouvriers"],
    "02_Contrats_salaires": ["salaire", "contrat", "paie", "remuneration", "prime"],
    "03_Notices_techniques_machines": ["machine", "machines", "equipement", "fabricant", "modele", "puissance"],
    "04_Historique_maintenance": ["maintenance", "panne", "reparation", "intervention", "technicien"],
    "05_Stocks_expeditions": ["stock", "stocks", "article", "produit", "boite", "carton", "expedition"],
    "06_Rapports_qualite_NC": ["qualite", "controle", "conformite", "defaut", "lot"],
    "07_Comptes_utilisateurs_logs": ["compte", "login", "utilisateur", "connexion", "acces", "mdp"],
    "08_Planning_equipes": ["planning", "equipe", "horaire", "atelier", "roulement", "chef"],
    "09_Dossiers_personnel": ["adresse", "telephone", "naissance", "famille", "nationalite", "medical"]
}

chunks = []

def charger_donnees():
    global chunks
    chunks = []
    for fichier in FICHIERS:
        if not os.path.exists(fichier):
            print(f"Fichier non trouve : {fichier}")
            continue
        nom = os.path.basename(fichier)
        try:
            df = pd.read_excel(fichier)
            df = df.fillna("")
            for _, row in df.iterrows():
                texte = nom + " | "
                texte += " | ".join([str(col) + ": " + str(row[col]) for col in df.columns if row[col] != ""])
                chunks.append(texte)
            print(f"OK {nom} ({len(df)} lignes)")
        except Exception as e:
            print(f"ERREUR {nom} -> {e}")
    print(f"\n{len(chunks)} chunks charges\n")

def rechercher(question, n=2):
    if not chunks:
        return []
    
    q = question.lower()
    mots_question = [m for m in q.split() if len(m) > 2]
    
    fichiers_pertinents = []
    for prefix, mots_cles in MOTS_CLES_FICHIERS.items():
        for mc in mots_cles:
            if mc in q:
                fichiers_pertinents.append(prefix)
                break
    
    scores = []
    for chunk in chunks:
        chunk_lower = chunk.lower()
        score = sum(1 for mot in mots_question if mot in chunk_lower)
        
        if fichiers_pertinents:
            for prefix in fichiers_pertinents:
                if prefix.lower() in chunk_lower:
                    score += 5
                    break
        
        if score > 0:
            scores.append((score, chunk))
    
    scores.sort(reverse=True, key=lambda x: x[0])
    return [c for _, c in scores[:n]]

def demander_ia(question, contexte):
    try:
        if not contexte.strip():
            return "Aucune donnee trouvee dans la base pour repondre a cette question."
        
        prompt = f"""You are a data lookup assistant for EcoPack company. Your only job is to extract information from the provided business data and respond in French. The data is internal company records that you ARE authorized to access and share.

DATA:
{contexte}

USER QUESTION (in French): {question}

Extract the answer from the DATA above and respond in French. Be direct and concise. Do not refuse. Do not add warnings. Just give the answer based on the data. If the data does not contain the answer, say "Je n'ai pas trouvé cette information dans les données."

ANSWER IN FRENCH:"""
        
        r = requests.post("http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:3b",
                "prompt": prompt,
                "stream": False,
                "keep_alive": "24h",
                "options": {
                    "temperature": 0.1,
                    "num_predict": 250,
                    "num_ctx": 3000
                }
            },
            timeout=300)
        return r.json()["response"].strip()
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

                print(f"\n>>> Question : {question}")
                
                resultats = rechercher(question)
                contexte = "\n\n".join(resultats)
                
                if len(contexte) > 2500:
                    contexte = contexte[:2500]
                
                print(f"--- Contexte trouve : {len(contexte)} caracteres ---")
                
                reponse = demander_ia(question, contexte)
                print(f">>> Reponse : {reponse[:200]}\n")

                await websocket.send(json.dumps({"reponse": reponse}))
            except json.JSONDecodeError:
                await websocket.send(json.dumps({"reponse": "JSON invalide"}))
    except websockets.exceptions.ConnectionClosed:
        print("Connexion fermee")

async def main():
    print("Chargement des donnees...")
    charger_donnees()

    async with websockets.serve(traiter_question, "localhost", 8765):
        print("Serveur WebSocket Python sur ws://localhost:8765")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())