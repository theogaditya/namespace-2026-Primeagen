# Contributing to SwarajDesk

First off, thank you for considering contributing to SwarajDesk! It's people like you that make SwarajDesk such a great tool for citizen grievance redressal.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Guidelines](#coding-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Project Structure](#project-structure)
- [Need Help?](#need-help)

---

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be Respectful**: Treat everyone with respect. No harassment, discrimination, or inappropriate behavior.
- **Be Constructive**: Provide constructive feedback and be open to receiving it.
- **Be Collaborative**: Work together to solve problems and improve the project.
- **Be Patient**: Remember that contributors have varying levels of experience.

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.x or higher
- **Bun** 1.3.x or higher
- **PostgreSQL** 15.x or higher
- **Redis** 7.x or higher
- **Git** installed on your machine
- A **GitHub** account

### Fork and Clone

1. **Fork the repository** by clicking the "Fork" button on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/sih-swarajdesk-2025.git
   cd sih-swarajdesk-2025
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/theogaditya/sih-swarajdesk-2025.git
   ```

---

## Development Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Set Up Environment

Copy example environment files:

```bash
# Backend services
cp packages/admin-be/example.env packages/admin-be/.env
cp packages/user-be/example.env packages/user-be/.env
cp packages/compQueue/example.env packages/compQueue/.env
cp packages/self/example.env packages/self/.env

# Frontend services
cp packages/admin-fe/example.env packages/admin-fe/.env.local
cp packages/user-fe/example.env packages/user-fe/.env.local
```

### 3. Set Up Database

```bash
cd packages/user-be
bunx prisma generate
bunx prisma migrate deploy
```

### 4. Start Development Servers

Start the services you need to work on (see README.md for detailed instructions).

---

## How to Contribute

### 🐛 Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

**When reporting a bug, include:**

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots (if applicable)
- Your environment (OS, Node.js version, Bun version, etc.)
- Error messages or logs

**Bug Report Template:**
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., Ubuntu 22.04]
- Node.js: [e.g., 18.17.0]
- Bun: [e.g., 1.3.0]
- Package: [e.g., user-be]
```

### 💡 Suggesting Features

We love feature suggestions! Please:

- Use a clear, descriptive title
- Provide a detailed description of the proposed feature
- Explain why this feature would be useful
- Include mockups or examples if possible

### 🔧 Code Contributions

1. **Check existing issues** for something you'd like to work on
2. **Comment on the issue** to let others know you're working on it
3. **Create a branch** for your work
4. **Make your changes** following our coding guidelines
5. **Test your changes** thoroughly
6. **Submit a pull request**

---

## Pull Request Process

### 1. Create a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- Write clean, well-documented code
- Add tests for new functionality
- Update documentation if needed

### 3. Test Your Changes

```bash
# Run tests for the package you modified
cd packages/user-be  # or the relevant package
bun run test:unit

# Make sure the app builds
bun run build
```

### 4. Commit Your Changes

Follow our [commit message guidelines](#commit-message-guidelines).

```bash
git add .
git commit -m "feat(user-be): add complaint status notification"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:

- A clear title describing the change
- A detailed description of what was changed and why
- Reference to any related issues (e.g., "Fixes #123")
- Screenshots for UI changes

### 6. Code Review

- Address any feedback from reviewers
- Make requested changes in new commits
- Once approved, your PR will be merged

---

## Coding Guidelines

### TypeScript

- Use **TypeScript** for all new code
- Enable **strict mode** in tsconfig
- Define proper **types and interfaces** - avoid `any`
- Use **meaningful variable and function names**

### Code Style

- Use **2 spaces** for indentation
- Use **single quotes** for strings
- Add **semicolons** at the end of statements
- Keep functions **small and focused**
- Write **self-documenting code** with clear naming

### File Organization

```
packages/
├── package-name/
│   ├── index.ts          # Main entry point
│   ├── bin.ts            # Server bootstrap
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   ├── lib/              # Utility functions
│   ├── services/         # Business logic
│   ├── prisma/           # Database schema
│   └── test/             # Tests
```

### API Guidelines

- Use **RESTful conventions**
- Return consistent **JSON responses**
- Include proper **error handling**
- Add **input validation** using Zod

### Frontend Guidelines

- Use **functional components** with hooks
- Implement **proper loading and error states**
- Follow **accessibility** best practices
- Use **Tailwind CSS** for styling

---

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvements |

### Scopes

Use the package name as scope:

- `user-be`
- `user-fe`
- `admin-be`
- `admin-fe`
- `compQueue`
- `self`

### Examples

```bash
feat(user-be): add complaint status notifications
fix(admin-fe): resolve dashboard loading issue
docs(readme): update installation instructions
test(user-be): add unit tests for auth middleware
chore(deps): update dependencies
```

---

## Project Structure

```
sih-swarajdesk-2025/
├── packages/
│   ├── admin-be/        # Admin backend (Express + Prisma)
│   ├── admin-fe/        # Admin frontend (Next.js)
│   ├── compQueue/       # Complaint queue processor
│   ├── self/            # AI/Image analysis service
│   ├── user-be/         # User backend (Express + Prisma)
│   ├── user-fe/         # User frontend (Next.js + Capacitor)
│   └── k8s/             # Kubernetes configurations
├── package.json         # Root package.json (workspaces)
├── README.md            # Project documentation
└── CONTRIBUTING.md      # This file
```

---

## Need Help?

- **Documentation**: Check the [README.md](./README.md) for setup instructions
- **API Docs**: See `packages/admin-be/doc/curl.md` for API examples
- **Issues**: Search existing [GitHub Issues](https://github.com/theogaditya/sih-swarajdesk-2025/issues)
- **Discussions**: Start a discussion on GitHub

---

## Recognition

Contributors will be recognized in:

- The project README
- Release notes for significant contributions
- Our contributors page

---

Thank you for contributing to SwarajDesk! Together, we can build a better platform for citizen grievance redressal. 🙏

---

<div align="center">

**Happy Contributing!** 🎉

</div>
