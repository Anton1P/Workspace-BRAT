// Points d'entrée de la librairie BRAT Parser

// Les types de données (Replay, Entities, Results, etc.)
export * from './core/parser/types';

// Le module principal permettant de parser le fichier
export * from './core/parser/replay-reader';

// Utilitaires de manipulation binaire
export * from './core/parser/binary-reader';

// Logique de décompression (Inflate + XOR)
export * from './core/parser/decompress';

// Décodeur d'inputs des joueurs
export * from './utils/input-decoder';
