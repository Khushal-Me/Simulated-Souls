
export interface GameAIResponse {
  sceneDescription: string;
  imagePrompt: string;
}

// Used for parsing the grounding metadata if googleSearch tool was used (not used in this app but good for reference)
export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
  // other types of grounding chunks can be defined here
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  // other grounding metadata fields
}

export interface Candidate {
  groundingMetadata?: GroundingMetadata;
  // other candidate fields
}
