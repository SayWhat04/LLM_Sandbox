# Document Processing & AI Analysis System

## Overview

This system provides a comprehensive solution for processing, analyzing, and manipulating various types of documents using AI-powered services. It combines multiple technologies including OpenAI GPT models, vector databases, search engines, and file processing capabilities to create an intelligent document management platform.

## Key Features

- 📄 **Multi-format Document Processing**: Support for PDF, DOCX, HTML, Markdown, images, audio, and more
- 🔍 **Hybrid Search**: Combines semantic vector search with traditional keyword search using Algolia
- 🤖 **AI-Powered Analysis**: Document summarization, translation, extraction, and synthesis
- 🌐 **Web Integration**: Fetch and process content from URLs and web pages
- 📊 **Database Storage**: SQLite database with vector embeddings for efficient retrieval
- 🎯 **Smart Querying**: Automatic query generation and context-aware responses

## Architecture

### Core Services

- **DocumentService**: Main orchestrator for AI-powered document operations
- **FileService**: Handles file processing, conversion, and format detection
- **OpenAIService**: Interface to OpenAI GPT models for AI operations
- **VectorService**: Manages vector embeddings and semantic search
- **SearchService**: Algolia integration for hybrid search capabilities
- **DatabaseService**: SQLite database operations with vector storage
- **TextService**: Text processing, chunking, and placeholder management
- **AudioService**: Audio file processing and transcription
- **WebSearchService**: Web content fetching and processing

## Main Capabilities

### 1. Document Processing
- Extract text from various file formats (PDF, DOCX, images, etc.)
- Convert between formats (HTML to Markdown, etc.)
- Handle Google Drive documents
- Process audio files with transcription

### 2. AI-Powered Analysis
- **Answer Questions**: Query documents using natural language
- **Summarization**: Generate concise summaries of long documents
- **Translation**: Translate content between languages while preserving formatting
- **Extraction**: Extract specific information using custom prompts
- **Synthesis**: Combine information from multiple sources to answer complex questions

### 3. Search & Retrieval
- **Vector Search**: Semantic similarity search using embeddings
- **Keyword Search**: Traditional text-based search via Algolia
- **Hybrid Search**: Combines both approaches for optimal results
- **Smart Query Generation**: Automatically generates multiple search queries

## Usage Examples

### Basic Document Processing
```typescript
const fileService = new FileService();
const { docs } = await fileService.process('path/to/document.pdf', 4500);
```

### Question Answering
```typescript
const answer = await documentService.answer('What is tokenizer?', docs);
console.log(answer);
```

### Document Translation
```typescript
const translatedDocs = await documentService.translate(docs, 'Polish', 'English');
```

### Content Extraction
```typescript
const extractedContent = await documentService.extract(
  docs, 
  'topics', 
  'A bullet list of general topics mentioned in the article.'
);
```

### Document Summarization
```typescript
const summary = await documentService.summarize(
  docs, 
  'Document is a fragment of AI_devs 3 course lesson'
);
```

## Configuration

### Environment Variables
```env
OPENAI_API_KEY=your_openai_api_key
ALGOLIA_APP_ID=your_algolia_app_id
ALGOLIA_API_KEY=your_algolia_api_key
```

### Database Setup
The system uses SQLite with vector extensions for storing documents and embeddings:
- Database file: `docs/database.db`
- Automatic schema creation
- Vector similarity search support

## File Structure

```
docs/
├── app.ts                 # Main application entry point
├── services/
│   ├── DocumentService.ts # Core document operations
│   ├── FileService.ts     # File processing and conversion
│   ├── OpenAIService.ts   # OpenAI API integration
│   ├── VectorService.ts   # Vector embeddings management
│   ├── SearchService.ts   # Algolia search integration
│   ├── DatabaseService.ts # SQLite database operations
│   ├── TextService.ts     # Text processing utilities
│   ├── AudioService.ts    # Audio processing
│   └── WebSearch.ts       # Web content fetching
├── prompts/
│   ├── answer.ts          # Q&A prompt templates
│   ├── extract.ts         # Content extraction prompts
│   ├── translate.ts       # Translation prompts
│   ├── summarize.ts       # Summarization prompts
│   ├── synthesize.ts      # Information synthesis prompts
│   ├── compress.ts        # Content compression prompts
│   └── queries.ts         # Query generation prompts
├── utils.ts               # Utility functions
├── article.md             # Sample document (Polish AI course content)
└── result.md              # Sample output (English translation)
```

## Supported File Formats

### Input Formats
- **Documents**: PDF, DOCX, DOC, TXT, MD, HTML
- **Spreadsheets**: XLSX, XLS, CSV
- **Images**: PNG, JPG, JPEG (with OCR)
- **Audio**: Various formats (with transcription)
- **Web**: URLs, web pages
- **Google Drive**: Documents and Spreadsheets

### Output Formats
- Markdown
- JSON
- CSV
- Plain text
- Structured data

## Advanced Features

### Prompt Engineering
The system includes sophisticated prompt templates for various tasks:
- Context-aware question answering
- Multi-step reasoning
- Information extraction with specific formats
- Translation with formatting preservation
- Summarization with different styles

### Vector Embeddings
- Automatic text chunking for optimal embedding
- Semantic similarity search
- Context-aware retrieval
- Hybrid ranking algorithms

### Web Integration
- URL content fetching
- HTML to Markdown conversion
- Web search integration
- Real-time content processing

## Performance Considerations

- **Chunking**: Documents are split into optimal chunks (default: 4500 characters)
- **Caching**: Database storage for processed documents
- **Parallel Processing**: Concurrent operations where possible
- **Memory Management**: Efficient handling of large documents

## Use Cases

1. **Document Analysis**: Analyze large document collections
2. **Content Translation**: Batch translation with formatting preservation
3. **Information Extraction**: Extract specific data from unstructured documents
4. **Research Assistant**: Answer questions across multiple documents
5. **Content Summarization**: Generate executive summaries
6. **Knowledge Base**: Build searchable document repositories

## Getting Started

1. **Install Dependencies**: Ensure all required packages are installed
2. **Set Environment Variables**: Configure OpenAI and Algolia keys
3. **Run the Application**: Execute `app.ts` to see the system in action
4. **Customize Prompts**: Modify prompt templates for specific use cases
5. **Extend Services**: Add new processing capabilities as needed

This system represents a comprehensive approach to AI-powered document processing, suitable for both research and production environments. 