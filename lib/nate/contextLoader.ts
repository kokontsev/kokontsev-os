import { promises as fs } from 'fs';
import path from 'path';

export type NateContextScope = 'default' | 'all' | 'planning' | 'project';

export interface NateContextOptions {
  scope?: NateContextScope;
  projects?: string[];
}

export interface NateMarkdownSection {
  name: string;
  path: string;
  content: string;
}

export interface NateContextMetadata {
  section_count: number;
  character_count: number;
  generated_at: string;
  warnings?: string[];
}

export interface NateContextResult {
  scope: NateContextScope;
  requested_projects: string[];
  sections: NateMarkdownSection[];
  combined_context: string;
  metadata: NateContextMetadata;
}

interface SectionDefinition {
  name: string;
  relativePath: string;
  required: boolean;
}

const NATE_DATA_DIR = path.join(process.cwd(), 'data', 'nate');

const PROJECT_PACKS = {
  work: 'projects/work.md',
  finance: 'projects/finance.md',
  trading: 'projects/trading.md',
  sport: 'projects/sport.md',
  english: 'projects/english.md',
  personality: 'projects/personality.md',
  relationships: 'projects/relationships.md',
  education: 'projects/education.md',
} as const;

const DEFAULT_PROJECTS = ['education', 'work', 'sport', 'trading', 'relationships'] as const;

const DEFAULT_SECTIONS: SectionDefinition[] = [
  { name: 'Initial Context Pack', relativePath: 'context_pack.initial.md', required: true },
  { name: '2026 Strategy', relativePath: 'strategy/2026_strategy.md', required: true },
  { name: '2026 Summer Strategy', relativePath: 'strategy/2026_summer_strategy.md', required: true },
  { name: 'Planning Rules', relativePath: 'rules/planning_rules.md', required: true },
  { name: 'Time Capacity Rules', relativePath: 'rules/time_capacity.md', required: true },
  { name: 'Permissions', relativePath: 'rules/permissions.md', required: true },
  { name: 'Nate Style', relativePath: 'rules/nate_style.md', required: true },
];

const PROJECT_BASE_SECTIONS: SectionDefinition[] = [
  { name: 'Initial Context Pack', relativePath: 'context_pack.initial.md', required: true },
  { name: 'Planning Rules', relativePath: 'rules/planning_rules.md', required: true },
  { name: 'Time Capacity Rules', relativePath: 'rules/time_capacity.md', required: true },
  { name: 'Permissions', relativePath: 'rules/permissions.md', required: true },
  { name: 'Nate Style', relativePath: 'rules/nate_style.md', required: true },
];

const isAllowedProject = (project: string): project is keyof typeof PROJECT_PACKS => {
  return Object.prototype.hasOwnProperty.call(PROJECT_PACKS, project);
};

const normalizeScope = (scope?: NateContextScope): NateContextScope => {
  return scope || 'default';
};

const normalizeProjects = (projects?: string[]): string[] => {
  if (!projects) {
    return [];
  }

  return projects.map((project) => project.trim().toLowerCase()).filter(Boolean);
};

const getProjectSection = (project: keyof typeof PROJECT_PACKS): SectionDefinition => ({
  name: `Project: ${project}`,
  relativePath: PROJECT_PACKS[project],
  required: false,
});

const assertSafeRelativePath = (relativePath: string) => {
  const normalizedPath = path.normalize(relativePath);
  const absolutePath = path.resolve(NATE_DATA_DIR, normalizedPath);
  const relativeToBase = path.relative(NATE_DATA_DIR, absolutePath);

  if (relativeToBase.startsWith('..') || path.isAbsolute(relativeToBase)) {
    throw new Error(`unsafe nate context path: ${relativePath}`);
  }
};

export async function loadMarkdownSection(name: string, relativePath: string): Promise<NateMarkdownSection> {
  assertSafeRelativePath(relativePath);

  const normalizedPath = path.normalize(relativePath);
  const absolutePath = path.resolve(NATE_DATA_DIR, normalizedPath);
  const content = await fs.readFile(absolutePath, 'utf8');

  return {
    name,
    path: normalizedPath.replace(/\\/g, '/'),
    content,
  };
}

export function buildCombinedContext(sections: NateMarkdownSection[]): string {
  return sections
    .map((section) => `---\n# SECTION: ${section.name}\nPath: ${section.path}\n---\n${section.content}`)
    .join('\n\n');
}

export async function loadNateContext(options: NateContextOptions = {}): Promise<NateContextResult> {
  const scope = normalizeScope(options.scope);
  const requestedProjects = normalizeProjects(options.projects);
  const warnings: string[] = [];

  if (!['default', 'all', 'planning', 'project'].includes(scope)) {
    throw new Error(`unsupported scope: ${scope}`);
  }

  for (const project of requestedProjects) {
    if (!isAllowedProject(project)) {
      throw new Error(`unknown project: ${project}`);
    }
  }

  let sectionDefinitions: SectionDefinition[] = [];
  let projectsToLoad: string[] = [];

  if (scope === 'default') {
    sectionDefinitions = DEFAULT_SECTIONS;
  }

  if (scope === 'planning') {
    projectsToLoad = requestedProjects.length ? requestedProjects : [...DEFAULT_PROJECTS];
    sectionDefinitions = [...DEFAULT_SECTIONS, ...projectsToLoad.map((project) => getProjectSection(project as keyof typeof PROJECT_PACKS))];
  }

  if (scope === 'project') {
    if (!requestedProjects.length) {
      throw new Error('projects query param is required when scope=project');
    }

    projectsToLoad = requestedProjects;
    sectionDefinitions = [...PROJECT_BASE_SECTIONS, ...projectsToLoad.map((project) => getProjectSection(project as keyof typeof PROJECT_PACKS))];
  }

  if (scope === 'all') {
    projectsToLoad = Object.keys(PROJECT_PACKS);
    sectionDefinitions = [
      ...DEFAULT_SECTIONS,
      ...projectsToLoad.map((project) => getProjectSection(project as keyof typeof PROJECT_PACKS)),
    ];
  }

  const sections: NateMarkdownSection[] = [];

  for (const sectionDefinition of sectionDefinitions) {
    try {
      const section = await loadMarkdownSection(sectionDefinition.name, sectionDefinition.relativePath);
      sections.push(section);
    } catch (error) {
      if (sectionDefinition.required) {
        throw new Error(`required context file is missing or unreadable: ${sectionDefinition.relativePath}`);
      }

      warnings.push(`optional context file is missing or unreadable: ${sectionDefinition.relativePath}`);
    }
  }

  const combinedContext = buildCombinedContext(sections);
  const metadata: NateContextMetadata = {
    section_count: sections.length,
    character_count: combinedContext.length,
    generated_at: new Date().toISOString(),
  };

  if (warnings.length) {
    metadata.warnings = warnings;
  }

  return {
    scope,
    requested_projects: requestedProjects,
    sections,
    combined_context: combinedContext,
    metadata,
  };
}
