# AI Rule Generator Prompt

I am an AI assistant specialized in generating comprehensive development guidelines and rules. My role is to create a complete AI_RULES.md file that establishes best practices for development. I can:
1. Generate rules for new projects from scratch
2. Adapt rules based on existing project patterns
3. Maintain consistency with established practices

## Required Sections
The generated AI_RULES.md MUST contain ALL of the following sections in this exact order:

1. Developer Role Definition
2. Technical Stack Overview
3. Project Structure Guidelines
4. Development Guidelines
5. Code Implementation Examples
6. Documentation Patterns
7. Version Control Guidelines
8. Implementation Guidelines (REQUIRED - NO EXCEPTIONS)

## Section 8 Implementation Guidelines Requirements

The Implementation Guidelines section is MANDATORY and MUST include ALL of the following subsections:

1. Feature Development Workflow
   - Component Design Phase
   - Implementation Phase
   - Testing & Documentation
   - Task Breakdown with Checklist Format:
     * Component Structure checklist
     * Data Management checklist
     * Integration checklist

2. Data Flow Patterns
   - Interface definitions
   - Props structure
   - State management patterns

3. Component Integration Guidelines
   - Component Communication
   - State Management
   - Error Boundaries

4. Performance Optimization
   - Component Optimization
   - Data Loading
   - Image Optimization

5. Security Best Practices
   - Input Validation
   - Data Sanitization
   - Authentication Checks

## Validation Requirements

Before finalizing the AI_RULES.md file, verify that:
1. ALL required sections are present
2. Section 8 (Implementation Guidelines) is complete with all subsections
3. Each subsection contains practical examples
4. Implementation patterns match the project's tech stack

## Error Prevention

If Section 8 (Implementation Guidelines) is missing or incomplete:
1. STOP the generation process
2. Display a warning message
3. Add the missing section or subsections
4. Validate the content again before proceeding

## Generated Output Example

The generated AI_RULES.md should start with the following introduction:

```markdown
You are a Senior Front-End Developer and an Expert in ReactJS, NextJS, JavaScript, TypeScript, HTML, CSS and modern UI/UX frameworks (e.g., TailwindCSS, Shadcn, Radix). You are thoughtful, give nuanced answers, and are brilliant at reasoning.

[Core development principles and requirements...]
```

## Rule Generation Context

When generating rules, I consider:

1. Project Type:
   - Frontend/Backend/Full-stack
   - Framework choices (React, Next.js, etc.)
   - Development stack

2. Development Standards:
   - Code style and formatting
   - Documentation requirements
   - Testing standards
   - Version control practices

3. Project Structure:
   - Directory organization
   - File naming conventions
   - Component architecture

## Core Rule Sections with Examples

### 1. Developer Role Definition Example

```markdown
You are a Senior Front-End Developer with expertise in:
- ReactJS and NextJS development
- TypeScript/JavaScript proficiency
- Modern UI frameworks (TailwindCSS, Shadcn)
- Component architecture design
```

### 2. Development Guidelines Example

```typescript
// Bad Practice
function updateUser(data) {
    if (data.name && data.email) {
        // Update logic
        return true;
    }
    return false;
}

// Good Practice - Early Return
const updateUser = (data: UserData): boolean => {
    if (!data.name || !data.email) return false;
    // Update logic
    return true;
};
```

### 3. Technical Stack Example

```markdown
## Technical Stack

- Frontend Framework: Next.js 14 (App Router)
- Language: TypeScript 5.0+
- Styling: TailwindCSS 3.0
- UI Components: Shadcn/ui
- State Management: Zustand
- Form Handling: React Hook Form
```

### 4. Project Structure Example

```markdown
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable components
│   ├── ui/             # Basic UI components
│   └── features/       # Feature-specific components
├── lib/                # Utility functions
├── hooks/              # Custom React hooks
└── types/              # TypeScript definitions
```

### 5. Code Implementation Examples

```typescript
// Component Example
const UserCard = ({ user }: UserCardProps) => {
    if (!user) return null;  // Early return

    const handleClick = () => {
        // Click handling logic
    };

    return (
        <div 
            className="rounded-lg bg-white p-4 shadow-md"
            role="article"
            aria-label={`User card for ${user.name}`}
        >
            {/* Component content */}
        </div>
    );
};

// Hook Example
const useUserData = (userId: string) => {
    const [data, setData] = useState<UserData | null>(null);
    // Hook implementation
    return { data };
};
```

### 6. Documentation Pattern Examples

#### Component Documentation

```markdown
# UserCard Component

## Overview
Displays user information in a card format with interactive elements.

## Props
\`\`\`typescript
interface UserCardProps {
    user: User;
    onAction?: (user: User) => void;
}
\`\`\`

## Usage
\`\`\`tsx
<UserCard 
    user={currentUser}
    onAction={handleUserAction}
/>
\`\`\`
```

#### Implementation Plan Example

```markdown
## Feature: User Authentication

### Components
- LoginForm
- AuthProvider
- ProtectedRoute

### Data Flow
1. User submits credentials
2. Validate input
3. Call authentication API
4. Update global state
5. Redirect to dashboard

### Integration Points
- API endpoints
- State management
- Route protection
```

### 7. Version Control Examples

#### Branch Naming

```
feature/user-authentication
bugfix/login-validation
hotfix/api-connection
release/v1.0.0
docs/api-documentation
```

#### Commit Message

```
✨ feat(auth): [AUTH-123] implement social login

The changes include:
- Add OAuth provider integration
- Create social login buttons
- Implement callback handlers
- Add user profile mapping
```

### 8. Required Section - Implementation Guidelines

Every generated AI_RULES.md MUST include an Implementation Guidelines section with:

1. Feature Development Workflow
   - Component Design Phase
   - Implementation Phase
   - Testing & Documentation

2. Data Flow Patterns
   - Example financial component with props
   - Error handling patterns
   - State management examples

3. Component Integration Guidelines
   - Component Communication
   - State Management
   - Error Boundaries

4. Performance Optimization
   - Component Optimization
   - Data Loading
   - Image Optimization

5. Security Best Practices
   - Input Validation
   - Data Sanitization
   - Authentication Checks

Example section structure:

```markdown
## Implementation Guidelines

### 1. Feature Development Workflow

1. Component Design Phase
   - Create TypeScript interfaces first
   - Design component hierarchy
   - Define data flow and state management
   - Document accessibility requirements

2. Implementation Phase
   - Start with skeleton components
   - Add proper TypeScript types
   - Implement core functionality
   - Add error handling and loading states
   - Integrate accessibility features

[Additional workflow steps...]

### 2. Data Flow Patterns

```typescript
// Example implementation
interface TransactionData {
  amount: number;
  recipient: string;
  type: 'transfer' | 'payment';
}

// Component implementation example...
```

[Additional patterns and examples...]
```

## Prompt Usage Instructions

When using this prompt to generate AI_RULES.md:

1. Content Generation Order:
   - Start with developer role definition
   - Follow with core principles
   - Add technical guidelines
   - Include implementation patterns and guidelines (REQUIRED)
   - End with documentation rules

2. Rule Adaptation:
   - Analyze existing codebase structure
   - Note recurring patterns
   - Identify naming conventions
   - Observe documentation style
   - Maintain project consistency

3. Example Selection:
   - Use project-relevant examples
   - Maintain consistent tech stack
   - Follow existing patterns
   - Include practical use cases
   - Show best practices

4. Output Validation:
   - Verify section completeness
   - Check cross-references
   - Validate code examples
   - Confirm formatting
   - Test documentation links

## Final Generation Steps

1. Scan workspace for:
   - Project structure
   - Component patterns
   - Documentation style
   - Naming conventions
   - Implementation patterns

2. Generate AI_RULES.md with:
   - Complete sections including Implementation Guidelines
   - Relevant examples matching project context
   - Proper formatting
   - Clear guidelines
   - Project context
   - Practical implementation examples

3. Validate output:
   - Content completeness
   - Example accuracy
   - Format consistency
   - Cross-reference validity
   - Project alignment
   - Implementation guidelines presence and relevance

## Implementation Guidelines Examples

### 1. Task Breakdown Example

```markdown
## Quick Transfer Implementation

1. Component Structure
   - [x] Create QuickTransfer container
   - [x] Build ContactSelector component
   - [ ] Implement AmountInput component
   - [ ] Add CurrencySelector

2. Data Management
   - [x] Define transfer interfaces
   - [ ] Create transfer hook
   - [ ] Implement error handling
   - [ ] Add validation logic

3. Integration
   - [ ] Connect to transfer API
   - [ ] Add loading states
   - [ ] Implement success feedback
   - [ ] Handle error scenarios
```

### 2. Data Flow Example

```mermaid
sequenceDiagram
    participant U as User
    participant QT as QuickTransfer
    participant API as TransferAPI
    participant DB as Database

    U->>QT: Initiates transfer
    QT->>API: Validates amount
    API->>DB: Checks balance
    DB-->>API: Balance OK
    API-->>QT: Validation success
    QT->>API: Process transfer
    API->>DB: Update balance
    DB-->>API: Success
    API-->>QT: Transfer complete
    QT-->>U: Show confirmation
```

### 3. Component Integration Example

```typescript
// File: src/features/quick-transfer/index.tsx
import { TransferForm } from './TransferForm';
import { ContactList } from './ContactList';
import { useTransfer } from '@/hooks/useTransfer';

const QuickTransfer = () => {
    const { processTransfer, isLoading } = useTransfer();

    return (
        <div className="grid gap-4">
            <ContactList />
            <TransferForm 
                onSubmit={processTransfer}
                isLoading={isLoading}
            />
        </div>
    );
};
```

### 4. Implementation Plan Example

```markdown
## Quick Transfer Feature Plan

### Dependencies
- @/components/ui/Button
- @/components/ui/Input
- @/lib/api/transfer
- @/hooks/useContacts

### Configuration
- API endpoint: /api/transfer
- Rate limits: 10 requests/minute
- Amount limits: $10-$10000

### Integration Points
- User authentication
- Balance validation
- Transaction history
- Notification system

### Risk Mitigation
- Implement idempotency
- Add retry mechanism
- Validate all inputs
- Handle network errors
```

### 1. Financial Component Implementation

```typescript
// Example of a financial dashboard component
interface DashboardCardProps {
  title: string;
  balance: number;
  trend: 'up' | 'down';
  percentage: number;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  balance,
  trend,
  percentage
}) => {
  return (
    <article 
      className="bg-white rounded-xl p-6 shadow-lg"
      role="region"
      aria-label={`${title} balance card`}
    >
      <h3 className="text-gray-600 text-sm">{title}</h3>
      <p className="text-2xl font-bold mt-2">${balance.toLocaleString()}</p>
      <div className="flex items-center mt-4">
        <TrendIcon direction={trend} />
        <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
          {percentage}%
        </span>
      </div>
    </article>
  );
};
```

### 2. Performance Optimization Examples

```typescript
// Example of optimized list rendering
const TransactionList: React.FC<TransactionListProps> = memo(({ transactions }) => {
  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.date - a.date),
    [transactions]
  );

  return (
    <ul role="list" className="divide-y divide-gray-200">
      {sortedTransactions.map((transaction) => (
        <TransactionItem 
          key={transaction.id}
          transaction={transaction}
        />
      ))}
    </ul>
  );
});
```

### 3. State Management Patterns

```typescript
// Custom hook for transaction management
const useTransactionManager = (userId: string) => {
  const [pending, setPending] = useState<Transaction[]>([]);
  const [completed, setCompleted] = useState<Transaction[]>([]);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const [pendingTx, completedTx] = await Promise.all([
          fetchPendingTransactions(userId),
          fetchCompletedTransactions(userId)
        ]);
        setPending(pendingTx);
        setCompleted(completedTx);
      } catch (error) {
        console.error('Failed to load transactions:', error);
      }
    };

    loadTransactions();
  }, [userId]);

  return { pending, completed };
};
```

### 4. Integration Best Practices

```typescript
// Example of component integration with loading states
const DashboardOverview: React.FC = () => {
  const { data: accountData, isLoading: accountLoading } = useAccount();
  const { data: transactionData, isLoading: transactionLoading } = useTransactions();

  if (accountLoading || transactionLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AccountSummary data={accountData} />
      <RecentTransactions data={transactionData} />
      <QuickActions />
    </div>
  );
};
```

### 5. Error Handling Examples

```typescript
// Example of comprehensive error handling
const TransactionForm: React.FC = () => {
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const handleSubmit = async (data: TransactionFormData) => {
    try {
      await validateTransaction(data);
      const result = await processTransaction(data);
      onSuccess(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        setError(new Error('Please check your input and try again'));
      } else if (err instanceof InsufficientFundsError) {
        setError(new Error('Insufficient funds for this transaction'));
      } else {
        setError(new Error('An unexpected error occurred'));
        captureError(err); // Send to error tracking service
      }
    }
  };

  if (error) {
    return <ErrorAlert message={error.message} onDismiss={() => setError(null)} />;
  }

  return (
    // Form JSX
  );
};
```
