/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DuplicateGroup } from '../types/dedup';
import { formatBytes } from './crypto';

/**
 * Generates an executable Bash script for macOS/Linux to resolve duplicate files safely.
 */
export function generateBashScript(
  duplicateGroups: DuplicateGroup[],
  mode: 'delete' | 'symlink' = 'delete'
): string {
  let script = `#!/usr/bin/env bash
# ==============================================================================
# DedupCore - Duplicate File Cleanup Script
# Generated: ${new Date().toISOString()}
# Mode: ${mode === 'symlink' ? 'Replace duplicates with Symbolic Links' : 'Move duplicates to Trash'}
# Total Groups: ${duplicateGroups.length}
# ==============================================================================

set -euo pipefail

DRY_RUN=1
TRASH_DIR="\${HOME}/.Trash/dedup_backup_\$(date +%Y%m%d_%H%M%S)"

echo "==> DedupCore Safety Check"
echo "    DRY_RUN is set to \${DRY_RUN} (1 = Simulation only, 0 = Execute)"
echo "    To execute real changes, edit this script and set DRY_RUN=0"
echo ""

if [ "\$DRY_RUN" -eq 0 ] && [ "${mode}" = "delete" ]; then
  mkdir -p "\$TRASH_DIR"
  echo "    Backup directory created: \$TRASH_DIR"
fi

TOTAL_SAVED_BYTES=0

`;

  let itemCounter = 1;
  for (const group of duplicateGroups) {
    const original = group.files.find(f => f.isOriginal) || group.files[0];
    const duplicates = group.files.filter(f => f.id !== original.id && f.markedAction !== 'keep');

    if (duplicates.length === 0) continue;

    script += `# Group ${itemCounter++}: Content SHA-256: ${group.hash.slice(0, 16)}... (${formatBytes(group.size)} each)\n`;
    script += `ORIGINAL="${original.path}"\n`;

    for (const dup of duplicates) {
      const action = dup.markedAction || 'delete';
      if (action === 'delete') {
        script += `DUP="${dup.path}"\n`;
        script += `if [ "\$DRY_RUN" -eq 1 ]; then\n`;
        script += `  echo "[DRY RUN] Would move to trash: '\$DUP' (saving ${formatBytes(dup.size)})"\n`;
        script += `else\n`;
        script += `  if [ -f "\$DUP" ]; then\n`;
        script += `    mv "\$DUP" "\$TRASH_DIR/"\n`;
        script += `    echo "[TRASHED] '\$DUP'"\n`;
        script += `  fi\n`;
        script += `fi\n`;
      } else if (action === 'symlink') {
        script += `DUP="${dup.path}"\n`;
        script += `if [ "\$DRY_RUN" -eq 1 ]; then\n`;
        script += `  echo "[DRY RUN] Would replace with symlink: '\$DUP' -> '\$ORIGINAL'"\n`;
        script += `else\n`;
        script += `  if [ -f "\$DUP" ]; then\n`;
        script += `    rm -f "\$DUP"\n`;
        script += `    ln -s "\$ORIGINAL" "\$DUP"\n`;
        script += `    echo "[SYMLINKED] '\$DUP' -> '\$ORIGINAL'"\n`;
        script += `  fi\n`;
        script += `fi\n`;
      }
    }
    script += `\n`;
  }

  script += `echo "==> Completed. Review your filesystem."\n`;
  return script;
}

/**
 * Generates a PowerShell script for Windows environments.
 */
export function generatePowerShellScript(
  duplicateGroups: DuplicateGroup[]
): string {
  let script = `<#
==============================================================================
DedupCore - Duplicate File Cleanup PowerShell Script
Generated: ${new Date().toISOString()}
==============================================================================
#>

[CmdletBinding()]
param (
    [switch]$WhatIf = $true
)

Write-Host "DedupCore PowerShell Resolution Tool" -ForegroundColor Cyan
if ($WhatIf) {
    Write-Host "Running in WHAT-IF / SIMULATION mode. No files will be deleted." -ForegroundColor Yellow
    Write-Host "Pass -WhatIf:$false to actually execute the cleanup." -ForegroundColor Yellow
}

`;

  let itemIdx = 1;
  for (const group of duplicateGroups) {
    const original = group.files.find(f => f.isOriginal) || group.files[0];
    const duplicates = group.files.filter(f => f.id !== original.id && f.markedAction !== 'keep');

    if (duplicates.length === 0) continue;

    script += `# Group ${itemIdx++}: Hash ${group.hash.slice(0, 16)}...\n`;
    script += `$Original = "${original.path.replace(/\//g, '\\')}"\n`;

    for (const dup of duplicates) {
      const winPath = dup.path.replace(/\//g, '\\');
      script += `Remove-Item -Path "${winPath}" -WhatIf:$WhatIf\n`;
    }
    script += `\n`;
  }

  return script;
}

/**
 * Generates a CSV report of all identified duplicates with SHA-256 hashes and paths.
 */
export function generateCSVReport(duplicateGroups: DuplicateGroup[]): string {
  const headers = ['Group_ID', 'Content_SHA256', 'File_Role', 'File_Size_Bytes', 'File_Path', 'Modified_Date', 'Action'];
  const rows: string[] = [headers.join(',')];

  for (const group of duplicateGroups) {
    for (const file of group.files) {
      const role = file.isOriginal ? 'Original' : 'Duplicate';
      const action = file.markedAction || (file.isOriginal ? 'keep' : 'delete');
      const safePath = `"${file.path.replace(/"/g, '""')}"`;
      rows.push([
        group.id,
        group.hash,
        role,
        file.size,
        safePath,
        file.modifiedAt,
        action,
      ].join(','));
    }
  }

  return rows.join('\n');
}

/**
 * Triggers a client-side file download in the browser.
 */
export function triggerDownload(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
