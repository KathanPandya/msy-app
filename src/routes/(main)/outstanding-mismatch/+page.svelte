<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { getMemberStatusLabel } from '$lib/constants/app-constants';
	import outstandingMismatchApi from '$lib/endpoints/outstandingMismatchApi';
	import type { OutstandingMismatch } from '$lib/types/outstandingMismatch';
	import { AlertTriangle, CheckCircle2, RefreshCw } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let report = $state<OutstandingMismatch.Report | null>(null);
	let isLoading = $state(true);
	let errorMessage = $state('');

	// Amounts are signed — a member who overpaid legitimately sits below zero.
	// Never clamp, just show the sign.
	function formatAmount(value: number): string {
		const sign = value < 0 ? '-' : '';
		return `${sign}₹${Math.abs(value).toLocaleString('en-IN')}`;
	}

	async function runCheck() {
		isLoading = true;
		errorMessage = '';
		try {
			const res = await outstandingMismatchApi.getReport();
			report = res.data;
		} catch (err: any) {
			errorMessage =
				err.response?.data?.message ||
				(err.code === 'ECONNABORTED'
					? 'The check timed out. Try again when the server is less busy.'
					: 'Failed to run the outstanding mismatch check.');
			report = null;
		} finally {
			isLoading = false;
		}
	}

	// On-demand check: runs once when the admin opens the page, then only on
	// an explicit re-run. Never polled — it recalculates every user.
	onMount(runCheck);

	const columns = [
		{ key: 'member', label: 'Member' },
		{ key: 'status', label: 'Status', width: 120 },
		{ key: 'stored', label: 'Stored', align: 'right' as const, width: 120 },
		{ key: 'calculated', label: 'Calculated', align: 'right' as const, width: 120 },
		{
			key: 'difference',
			label: 'Difference',
			align: 'right' as const,
			width: 120,
			render: (_value: any, row: any) => {
				const diff = row.raw.difference as number;
				const color = diff > 0 ? 'text-red-600' : 'text-amber-600';
				return `<span class="font-semibold ${color}">${formatAmount(diff)}</span>`;
			}
		}
	];

	const tableData = $derived(
		(report?.mismatches ?? []).map((m) => ({
			_id: m.userId,
			member: [m.member_id, m.name].filter(Boolean).join(' · ') || m.userId,
			status: getMemberStatusLabel(m.status),
			stored: formatAmount(m.stored_outstanding_amount),
			calculated: formatAmount(m.api_outstanding_amount),
			difference: '',
			raw: m
		}))
	);
</script>

<div class="flex h-full flex-col">
	<div class="mb-1.5 flex flex-shrink-0 items-center gap-2 px-1">
		{#if report && !isLoading}
			<p class="text-sm text-gray-700">
				{report.mismatchCount} mismatch{report.mismatchCount === 1 ? '' : 'es'} in {report.totalUsers}
				member{report.totalUsers === 1 ? '' : 's'}
			</p>
		{/if}
		<div class="ml-auto">
			<Button variant="secondary" size="sm" onclick={runCheck} disabled={isLoading}>
				<RefreshCw class="h-3.5 w-3.5 {isLoading ? 'animate-spin' : ''}" />
				{isLoading ? 'Checking...' : 'Re-run'}
			</Button>
		</div>
	</div>

	{#if report && report.errorCount > 0 && !isLoading}
		<div class="mb-1.5 flex-shrink-0 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
			<div class="flex items-start gap-2">
				<AlertTriangle class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
				<div class="min-w-0 text-xs text-amber-900">
					<p class="font-medium">
						{report.errorCount} member{report.errorCount === 1 ? '' : 's'} could not be checked — these
						are unverified, not clean.
					</p>
					<ul class="mt-1 space-y-0.5">
						{#each report.errors as e (e.userId)}
							<li class="truncate"><span class="font-mono">{e.userId}</span> — {e.message}</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	{/if}

	<div class="min-h-0 flex-1">
		{#if isLoading}
			<div
				class="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm"
			>
				<div class="text-center">
					<div
						class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<p class="mt-2 text-sm text-gray-600">Recalculating every member's outstanding...</p>
					<p class="mt-0.5 text-xs text-gray-500">This can take a while. Please don't navigate away.</p>
				</div>
			</div>
		{:else if errorMessage}
			<div
				class="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
			>
				<AlertTriangle class="h-12 w-12 text-red-400" />
				<h3 class="mt-2 text-sm font-medium text-gray-900">Check failed</h3>
				<p class="mt-1 text-center text-sm text-gray-500">{errorMessage}</p>
				<div class="mt-4">
					<Button variant="secondary" size="sm" onclick={runCheck}>Try again</Button>
				</div>
			</div>
		{:else if tableData.length === 0}
			<div
				class="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
			>
				<CheckCircle2 class="h-12 w-12 text-green-500" />
				<h3 class="mt-2 text-sm font-medium text-gray-900">No mismatches found</h3>
				<p class="mt-1 text-center text-sm text-gray-500">
					All {report?.totalUsers ?? 0} members' stored outstanding amounts match the calculated ones.
				</p>
			</div>
		{:else}
			<Table {columns} data={tableData} />
		{/if}
	</div>
</div>
