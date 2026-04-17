---
name: Qrag-pipeline
description: "RAG pipeline architect. Covers document loading, chunking strategies, embedding models, vector databases (Chroma, pgvector, Pinecone, Qdrant), hybrid search, reranking, and evaluation with RAGAS. Use for RAG setup, vector DB, embedding, chunking, retrieval, semantic search."
invocation_trigger: "When building RAG pipelines, setting up vector databases, choosing chunking strategies, or evaluating retrieval quality."
recommendedModel: sonnet
---

# Qrag-pipeline: RAG Architecture & Implementation Guide

## 1. RAG Pipeline Overview

End-to-end RAG flow:

```
Document Load → Chunk → Embed → Store → Query → Retrieve → Rerank → Generate
     ↑                                                              ↓
     └──────────────── Evaluation & Monitoring ──────────────────┘
```

**Key stages:**
- **Load**: Extract text from source documents
- **Chunk**: Split into semantically coherent segments
- **Embed**: Convert chunks to vector representations
- **Store**: Persist in vector database with metadata
- **Query**: Transform user input to embedding
- **Retrieve**: Fetch similar chunks via similarity/hybrid search
- **Rerank**: Re-order results by relevance
- **Generate**: LLM synthesizes answer from context

**Golden rule**: Quality of retrieval determines generation quality. Focus 70% effort on retrieval.

---

## 2. Document Loading

Load documents from various sources with language/format awareness.

### 2.1 PDF Loading

```python
from langchain_community.document_loaders import PyPDFLoader

loader = PyPDFLoader("invoice.pdf")
docs = loader.load()

# Output: [Document(page_content="...", metadata={"source": "invoice.pdf", "page": 0})]

# For multiple PDFs:
from pathlib import Path
pdf_files = Path("./docs").glob("*.pdf")
all_docs = []
for pdf_file in pdf_files:
    loader = PyPDFLoader(str(pdf_file))
    all_docs.extend(loader.load())
```

**Gotchas**: PDF text extraction quality varies. Use OCR if PDFs are scanned images.

### 2.2 HTML Loading

```python
from langchain_community.document_loaders import UnstructuredHTMLLoader

loader = UnstructuredHTMLLoader("page.html")
docs = loader.load()

# With strategy parameter (fast, hi_res, auto)
from langchain_community.document_loaders import UnstructuredHTMLLoader
loader = UnstructuredHTMLLoader("page.html", mode="single", strategy="hi_res")
docs = loader.load()
```

### 2.3 Code Loading (Language-Aware)

```python
from langchain_community.document_loaders.generic import DirectoryLoader
from langchain_text_splitters import Language, RecursiveCharacterTextSplitter

# Load Python files with language awareness
loader = DirectoryLoader(
    "./src",
    glob="**/*.py",
    loader_cls=UnstructuredFileLoader
)
docs = loader.load()

# Better: use language-aware splitting
splitter = RecursiveCharacterTextSplitter.from_language(
    language=Language.PYTHON,
    chunk_size=512,
    chunk_overlap=80
)
code_docs = splitter.split_documents(docs)
```

Supports: Python, JavaScript, TypeScript, Java, Go, Rust, SQL, Markdown.

### 2.4 Batch Directory Loading

```python
from langchain_community.document_loaders import DirectoryLoader

loader = DirectoryLoader(
    "./documents",
    glob="**/*.txt",
    show_progress=True,
    max_concurrency=8
)
docs = loader.load()
```

---

## 3. Chunking Strategies

Chunking is **as critical as embedding model choice**. Bad chunking = high retrieval loss.

### 3.1 Fixed-Size Recursive (Recommended)

**Benchmark winner**: 512 tokens, 80 overlap. Works for 85% of use cases.

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,  # tokens (approx 4 chars per token for English)
    chunk_overlap=80,
    separators=["\n\n", "\n", " ", ""],  # recursive fallback
    length_function=len,
)

chunks = splitter.split_documents(documents)
```

**Why this works**: 
- Recursive separators respect document structure (paragraphs → sentences → words)
- 80-token overlap maintains context across chunk boundaries
- 512 tokens ≈ 1-2 paragraphs ≈ retrieval sweet spot

### 3.2 Code-Aware Chunking

```python
from langchain_text_splitters import Language, RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter.from_language(
    language=Language.PYTHON,
    chunk_size=512,
    chunk_overlap=80
)

chunks = splitter.split_documents(python_docs)
```

Respects: function boundaries, class definitions, import statements. Essential for code RAG.

### 3.3 Semantic Chunking (Experimental)

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
splitter = SemanticChunker(embeddings, breakpoint_threshold_type="percentile")

chunks = splitter.split_documents(documents)
```

**Trade-off**: Higher quality chunks, 3-5x slower, higher API cost. Use for critical documents.

### 3.4 Tuning Strategy

**Benchmark process**:
```python
from ragas.metrics import context_recall

chunk_sizes = [256, 512, 1024]
overlaps = [0, 50, 80]

for size in chunk_sizes:
    for overlap in overlaps:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=size,
            chunk_overlap=overlap
        )
        chunks = splitter.split_documents(docs)
        # Evaluate retrieval quality (see Section 7)
        score = evaluate_retrieval(chunks)
        print(f"Size={size}, Overlap={overlap}: {score}")
```

---

## 4. Embedding Models

**Table: Production Embedding Models**

| Model | Dims | Context | Type | Notes |
|-------|------|---------|------|-------|
| text-embedding-3-small | 512 | 8K | API | OpenAI, cheap, good for most uses |
| text-embedding-3-large | 3072 | 8K | API | OpenAI, high quality, 5x cost |
| Cohere embed-v3 | 1024 | 512K | API | Long context, good for dense retrieval |
| nomic-embed-text | 768 | 8K | Local (Ollama) | Open, no API costs, GPU required |
| BGE-large-en-v1.5 | 1024 | 512 | Local | Excellent for Chinese+English |
| all-MiniLM-L6-v2 | 384 | 256 | Local | Fastest (0.1s/doc), GPU optional |

### 4.1 OpenAI Embeddings

```python
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Embed a single string
query_embedding = embeddings.embed_query("What is RAG?")

# Embed multiple documents
chunk_embeddings = embeddings.embed_documents(
    [chunk.page_content for chunk in chunks]
)
```

### 4.2 Local Embeddings via Ollama

```python
from langchain_community.embeddings import OllamaEmbeddings

# Requires: ollama pull nomic-embed-text
embeddings = OllamaEmbeddings(model="nomic-embed-text")

query_embedding = embeddings.embed_query("What is RAG?")
```

### 4.3 Cohere Embeddings

```python
from langchain_cohere import CohereEmbeddings

embeddings = CohereEmbeddings(model="embed-english-v3.0")
```

**Selection guide**:
- **API-based (OpenAI/Cohere)**: No infrastructure, easy scaling, $$
- **Local (Ollama/BGE)**: Free, latency-sensitive, requires GPU

---

## 5. Vector Databases

**Table: Vector DB Comparison**

| Database | Type | Sweet Spot | Setup |
|----------|------|-----------|-------|
| Chroma | In-memory/SQLite | Prototyping, 10K-100K docs | `pip install chromadb` |
| pgvector | PostgreSQL extension | Production, 1M+ docs | PostgreSQL + CREATE EXTENSION |
| Qdrant | Standalone | Sub-100ms latency, filtering | Docker: `docker run qdrant/qdrant` |
| Pinecone | Managed cloud | Serverless, auto-scaling | Cloud managed |
| Weaviate | Multi-modal | Images + text | Docker or cloud |

### 5.1 Chroma (Easy Start)

```python
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# In-memory store
vector_store = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    collection_name="my_collection"
)

# Similarity search
results = vector_store.similarity_search("What is RAG?", k=5)

# With similarity score
results_with_scores = vector_store.similarity_search_with_score(
    "What is RAG?", k=5
)
for doc, score in results_with_scores:
    print(f"Score: {score:.3f} | Content: {doc.page_content[:100]}")

# Persist to disk
vector_store = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"
)

# Load from disk
vector_store = Chroma(
    persist_directory="./chroma_db",
    embedding_function=embeddings
)
```

### 5.2 pgvector (Production Scale)

```sql
-- PostgreSQL setup
CREATE EXTENSION vector;

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI embedding size
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

```python
from langchain_community.vectorstores.pgvector import PGVector
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

connection_string = "postgresql://user:password@localhost:5432/rag_db"

vector_store = PGVector.from_documents(
    documents=chunks,
    embedding=embeddings,
    collection_name="documents",
    connection_string=connection_string,
)

# Query with metadata filter
results = vector_store.similarity_search_with_filter(
    "What is RAG?",
    filter={"source": "wikipedia.txt"},
    k=5
)
```

### 5.3 Qdrant (Sub-100ms Latency)

```python
from langchain_community.vectorstores import Qdrant
from qdrant_client import QdrantClient

client = QdrantClient(":memory:")  # or "http://localhost:6333"

vector_store = Qdrant.from_documents(
    documents=chunks,
    embedding=embeddings,
    client=client,
    collection_name="documents"
)

# Query with filters
results = vector_store.similarity_search(
    "What is RAG?",
    query_filter={
        "must": [{"key": "source", "match": {"value": "faq.txt"}}]
    },
    k=5
)
```

---

## 6. Retrieval Strategies

Retrieval quality = Ground truth for RAG quality.

### 6.1 Similarity Search (Baseline)

```python
# Cosine similarity (default)
results = vector_store.similarity_search("What is RAG?", k=5)
```

**Limitation**: Mode collapse. All top results similar to each other.

### 6.2 MMR (Maximal Marginal Relevance)

```python
# Chroma + MMR
results = vector_store.max_marginal_relevance_search(
    "What is RAG?",
    k=5,
    fetch_k=20,  # Fetch 20 candidates, rerank to top 5
    lambda_mult=0.5  # 0 = pure diversity, 1 = pure relevance
)
```

**Benefit**: Diverse results. Reduces redundancy in LLM input.

### 6.3 Hybrid Search (BM25 + Vector + RRF)

85% of production systems use hybrid search.

```python
from langchain.retrievers import BM25Retriever, EnsembleRetriever
from langchain_community.vectorstores import Chroma

# Vector retriever
vector_retriever = vector_store.as_retriever(search_kwargs={"k": 5})

# BM25 retriever (keyword-based)
from langchain_text_splitters import RecursiveCharacterTextSplitter
splitter = RecursiveCharacterTextSplitter()
bm25_retriever = BM25Retriever.from_documents(chunks)
bm25_retriever.k = 5

# Ensemble with reciprocal rank fusion
ensemble_retriever = EnsembleRetriever(
    retrievers=[vector_retriever, bm25_retriever],
    weights=[0.5, 0.5]  # Equal weight to each
)

results = ensemble_retriever.invoke("What is RAG?")
```

**Why RRF**: Combines relevance scores from different ranking schemes. Better recall than pure vector.

### 6.4 Reranking with Cohere

```python
from langchain_community.document_compressors import CohereRerank
from langchain.retrievers import ContextualCompressionRetriever

compressor = CohereRerank(model="rerank-english-v3.0", top_n=5)

compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=ensemble_retriever
)

final_results = compression_retriever.invoke("What is RAG?")
```

**Flow**: BM25 + Vector (20 results) → Cohere Rerank (top 5) → LLM

**Benefit**: Cohere specializes in ranking. Catches irrelevant results early.

### 6.5 Query Routing

```python
from langchain.chains import StuffDocumentsChain
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4")

# Route complex queries to graph search, simple to vector
routing_prompt = """
Classify query as SIMPLE or COMPLEX.
SIMPLE: factual lookup (e.g., "What is RAG?")
COMPLEX: multi-step reasoning, comparison

Query: {query}
Classification:
"""

from langchain_core.prompts import PromptTemplate
prompt = PromptTemplate(input_variables=["query"], template=routing_prompt)

def route_query(query: str):
    classification = llm.predict(text=prompt.format(query=query))
    if "SIMPLE" in classification:
        return vector_retriever.invoke(query)
    else:
        return ensemble_retriever.invoke(query)
```

---

## 7. Evaluation with RAGAS

RAGAS = Retrieval Augmented Generation Assessment. No ground truth needed.

### 7.1 Retrieval Metrics

```python
from ragas.metrics import (
    context_recall,
    context_precision,
    answer_relevancy,
    faithfulness
)
from ragas import evaluate
from datasets import Dataset

# Prepare eval dataset
eval_data = {
    "question": ["What is RAG?", "How does embedding work?"],
    "answer": ["RAG combines retrieval and generation...", "Embeddings convert text to vectors..."],
    "contexts": [
        [doc1.page_content, doc2.page_content],
        [doc3.page_content, doc4.page_content]
    ]
}

eval_dataset = Dataset.from_dict(eval_data)

# Run evaluation
results = evaluate(
    eval_dataset,
    metrics=[context_recall, context_precision, answer_relevancy, faithfulness]
)

print(results)
# Output:
# context_recall: 0.85 (0-1, higher better)
# context_precision: 0.90
# answer_relevancy: 0.88
# faithfulness: 0.92
```

### 7.2 Metric Thresholds

| Metric | Threshold | Interpretation |
|--------|-----------|-----------------|
| MRR (Mean Reciprocal Rank) | >0.7 | Top result relevant ~70% of time |
| NDCG@10 | >0.8 | Top-10 relevance ranking quality |
| Hit Rate@K | >0.9 | Relevant doc in top K |
| Context Recall | >0.8 | Retriever found necessary info |
| Context Precision | >0.9 | Minimal irrelevant context |
| Faithfulness | >0.9 | Answer grounded in context |
| Answer Relevancy | >0.85 | Answer addresses question |

### 7.3 Synthetic Test Generation

```python
from ragas.testset_generator import TestsetGenerator
from langchain_openai import ChatOpenAI

generator = TestsetGenerator.from_langchain_docs(
    documents=chunks,
    llm=ChatOpenAI(model="gpt-3.5-turbo"),
    embeddings=embeddings
)

# Generate 100 Q&A pairs
test_set = generator.generate(
    test_size=100,
    distributions={
        "simple": 0.5,  # Factual
        "multi_context": 0.3,  # Multi-doc reasoning
        "reasoning": 0.2  # Complex reasoning
    }
)

# Evaluate
results = evaluate(test_set, metrics=[...])
```

---

## 8. Production Patterns

### 8.1 Metadata Filtering

```python
# Store documents with metadata
from langchain_core.documents import Document

docs_with_metadata = [
    Document(
        page_content="RAG combines retrieval and generation...",
        metadata={
            "source": "rag_paper.pdf",
            "page": 1,
            "section": "Introduction",
            "date": "2024-01-15",
            "author": "Smith"
        }
    ),
    # ... more docs
]

# Store in pgvector
vector_store = PGVector.from_documents(
    documents=docs_with_metadata,
    embedding=embeddings,
    connection_string=connection_string
)

# Query with filters
results = vector_store.similarity_search_with_filter(
    "What is RAG?",
    filter={"source": "rag_paper.pdf", "date": ">2024-01-01"},
    k=5
)
```

### 8.2 Caching FAQ

```python
from functools import lru_cache

faq_cache = {}

def retrieve_with_faq_cache(query: str, k: int = 5):
    # Check cache first
    if query in faq_cache:
        return faq_cache[query]
    
    # Retrieve if not cached
    results = vector_store.similarity_search(query, k=k)
    
    # Cache top result
    faq_cache[query] = results
    return results
```

### 8.3 Retrieval Quality Monitoring

```python
from datetime import datetime
import json

retrieval_log = []

def log_retrieval(query: str, results: list, generation_success: bool):
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "query": query,
        "num_results": len(results),
        "top_score": results[0][1] if results else 0,
        "generation_success": generation_success
    }
    retrieval_log.append(log_entry)
    
    # Alert if quality degrading
    if len(retrieval_log) > 100:
        recent_success_rate = sum(
            1 for entry in retrieval_log[-100:]
            if entry["generation_success"]
        ) / 100
        if recent_success_rate < 0.8:
            print(f"WARNING: Retrieval quality degrading ({recent_success_rate:.1%})")
```

### 8.4 Query Expansion (Improve Recall)

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-3.5-turbo")

def expand_query(original_query: str) -> list[str]:
    expansion_prompt = f"""
    Generate 3 alternative ways to phrase this query for semantic search.
    Original: {original_query}
    
    Alternative phrasings (one per line):
    """
    
    expanded = llm.predict(text=expansion_prompt)
    return [original_query] + [line.strip() for line in expanded.split("\n") if line.strip()]

# Retrieve with multiple queries
queries = expand_query("What is RAG?")
all_results = []
for q in queries:
    all_results.extend(vector_store.similarity_search(q, k=3))

# Deduplicate
unique_results = {r.page_content: r for r in all_results}.values()
```

---

## Quick Start Template

```python
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA

# 1. Load documents
loader = PyPDFLoader("document.pdf")
documents = loader.load()

# 2. Chunk
splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=80)
chunks = splitter.split_documents(documents)

# 3. Embed & store
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vector_store = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"
)

# 4. Retrieve & generate
llm = ChatOpenAI(model="gpt-4")
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=vector_store.as_retriever(search_kwargs={"k": 5})
)

# 5. Query
answer = qa_chain.run("What is RAG?")
print(answer)
```

---

## Key Insights

1. **Chunking > Model**: Spend 70% effort on retrieval pipeline tuning, 30% on LLM choice
2. **Overlap matters**: 80-token overlap (15-20%) is production standard
3. **Hybrid is default**: BM25 + Vector with RRF handles 95% of queries
4. **Reranking is cheap**: Cohere rerank adds 50-100ms but catches 10-15% more relevant results
5. **No ground truth needed**: RAGAS metrics allow evaluation without manual labels
6. **Monitor quality**: Track retrieval success rate in production (target: >80%)
7. **Query expansion**: 3x overhead but 20-30% recall improvement for ambiguous queries
