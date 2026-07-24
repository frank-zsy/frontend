import type { OpenRankRepoContribution } from '../types/talent';

type Props = {
  repos: OpenRankRepoContribution[];
};

export function TalentTopRepos({ repos }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {repos.map((repo, idx) => {
        const org = repo.repoName.split('/')[0] || '';
        const avatarUrl = `https://github.com/${org}.png?size=32`;
        const repoUrl = `https://github.com/${repo.repoName}`;

        return (
          <div
            key={repo.repoId}
            className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
          >
            <span className="w-6 flex-shrink-0 text-center text-xs font-bold text-muted-foreground">
              #{idx + 1}
            </span>
            <img
              src={avatarUrl}
              alt={org}
              className="size-6 flex-shrink-0 rounded-full"
              loading="lazy"
            />
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-sm text-foreground hover:text-primary hover:underline"
            >
              {repo.repoName}
            </a>
            <span className="flex-shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
              {repo.openrank.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
