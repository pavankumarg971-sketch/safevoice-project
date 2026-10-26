import os
import csv
import math
import pickle
import re

EMERGENCY_BOOST_WORDS = {
    'help': 'EMERGENCY',
    'emergency': 'EMERGENCY',
    'police': 'EMERGENCY',
    'save': 'EMERGENCY',
    'danger': 'EMERGENCY',
    'ambulance': 'EMERGENCY',
    'kidnap': 'EMERGENCY',
    'kidnapping': 'EMERGENCY',
    'cops': 'EMERGENCY',
    '911': 'EMERGENCY',
    '112': 'EMERGENCY',
    'kill': 'THREAT',
    'killing': 'THREAT',
    'threat': 'THREAT',
    'threaten': 'THREAT',
    'threatening': 'THREAT',
    'attack': 'THREAT',
    'stop': 'THREAT',
    'scream': 'THREAT',
    'beat': 'THREAT',
    'hurt': 'THREAT',
    'following': 'HARASSMENT',
    'follow': 'HARASSMENT',
    'stalk': 'HARASSMENT',
    'stalking': 'HARASSMENT',
    'stalker': 'HARASSMENT',
    'harass': 'HARASSMENT',
    'harassing': 'HARASSMENT',
    'harassment': 'HARASSMENT',
    'creep': 'HARASSMENT',
    'creepy': 'HARASSMENT',
    'pictures': 'HARASSMENT',
    'photos': 'HARASSMENT',
    'watching': 'HARASSMENT',
    'scared': 'DISTRESS',
    'afraid': 'DISTRESS',
    'fear': 'DISTRESS',
    'terrified': 'DISTRESS',
    'unsafe': 'DISTRESS',
    'lost': 'DISTRESS',
    'alone': 'DISTRESS',
    'crying': 'DISTRESS',
    'stranded': 'DISTRESS',
    'weapon': 'ASSAULT',
    'gun': 'ASSAULT',
    'knife': 'ASSAULT',
    'assault': 'ASSAULT',
    'assaulted': 'ASSAULT',
    'grab': 'ASSAULT',
    'grabbed': 'ASSAULT',
    'hit': 'ASSAULT',
    'punch': 'ASSAULT',
    'punched': 'ASSAULT',
    'battered': 'ASSAULT',
    'choke': 'ASSAULT',
    'choking': 'ASSAULT',
    'stab': 'ASSAULT',
    'stabbed': 'ASSAULT',
}

class NaiveBayesTextClassifier:
    def __init__(self):
        self.vocab = set()
        self.class_counts = {}
        self.word_counts = {}
        self.total_docs = 0
        self.total_words = 0
        self.log_class_priors = {}
        self.log_word_likelihoods = {}

    def _tokenize(self, text: str):
        # Extract clean alphanumeric words, stripping punctuation
        return re.findall(r'\b[a-z0-9]+\b', text.lower())

    def fit(self, texts, labels):
        self.total_docs = len(texts)
        for label in set(labels):
            self.class_counts[label] = 0
            self.word_counts[label] = {}
        for text, label in zip(texts, labels):
            self.class_counts[label] += 1
            for word in self._tokenize(text):
                self.vocab.add(word)
                self.word_counts[label][word] = self.word_counts[label].get(word, 0) + 1
                self.total_words += 1

        # Calculate log priors
        self.log_class_priors = {c: math.log(cnt / self.total_docs) for c, cnt in self.class_counts.items()}
        vocab_size = len(self.vocab)

        for c in self.class_counts:
            total_c_words = sum(self.word_counts[c].values())
            self.log_word_likelihoods[c] = {}
            for w in self.vocab:
                count = self.word_counts[c].get(w, 0)
                prob = (count + 1) / (total_c_words + vocab_size)  # Laplace smoothing
                self.log_word_likelihoods[c][w] = math.log(prob)

    def predict_proba(self, text):
        tokens = self._tokenize(text)
        if not tokens:
            return "NORMAL", 0.95

        scores = {}
        matched_in_vocab = 0

        for c in self.class_counts:
            score = self.log_class_priors.get(c, 0.0)
            for w in tokens:
                if w in self.vocab:
                    matched_in_vocab += 1
                    score += self.log_word_likelihoods[c].get(w, -10.0)
                else:
                    # Smoothing penalty for unseen word
                    total_c = sum(self.word_counts[c].values())
                    score += math.log(1.0 / (total_c + len(self.vocab) + 1))
            scores[c] = score

        # Keyword semantic boost for high-priority emergency terminology
        for w in tokens:
            if w in EMERGENCY_BOOST_WORDS:
                target_cat = EMERGENCY_BOOST_WORDS[w]
                if target_cat in scores:
                    scores[target_cat] += 4.5  # Significant priority boost

        # Softmax probability distribution
        max_log = max(scores.values())
        exp_scores = {c: math.exp(s - max_log) for c, s in scores.items()}
        total = sum(exp_scores.values())
        probs = {c: exp_scores[c] / total for c in exp_scores}

        # If no recognizable words were matched and no emergency keywords found, classify as NORMAL
        if matched_in_vocab == 0 and not any(w in EMERGENCY_BOOST_WORDS for w in tokens):
            return "NORMAL", 0.88

        best = max(probs, key=probs.get)
        return best, probs[best]
