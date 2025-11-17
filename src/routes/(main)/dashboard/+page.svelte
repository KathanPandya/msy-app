<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		Users,
		UserCheck,
		UserX,
		UserMinus,
		DollarSign,
		TrendingUp,
		MapPin,
		Hash,
		UserCircle,
		OctagonX,
		SmilePlus,
		IndianRupee,
		TriangleAlert
	} from '@lucide/svelte';
	import { memberListStore } from '$lib/stores/memberListStore';
	import { formatString } from '$lib/utilities/stringUtils';
	import dashboardApi from '$lib/endpoints/dashboardApi';

	// State
	let isLoading = $state(true);
	let dashboardData = $state({
		members: {
			total: 0,
			active: 0,
			deceased: 0,
			cancelled: 0,
			removed: 0
		},
		financial: {
			totalCollected: 0,
			pending: 0,
			target: 0
		},
		demographics: {
			male: 0,
			female: 0,
			other: 0,
			topSurnames: [] as { surname: string; count: number }[],
			topDistricts: [] as { name: string; count: number }[]
		},
		outstanding: {
			highest: [] as { full_name: string; outstanding_amount: number; _id: string }[],
			lowest: [] as { full_name: string; outstanding_amount: number; _id: string }[]
		}
	});

	// Fetch dashboard data
	onMount(async () => {
		try {
			const res = await dashboardApi.getDashboardStats();
			console.log('res', res);

			if ($memberListStore.members.length === 0) {
				memberListStore.fetchAllMembers();
			}

			// let uniqueSurnames: Record<string, number> = {};

			$memberListStore.members.forEach((user) => {
				dashboardData.members.total += 1;

				const sName = user.surname.toLowerCase().trim();

				// if (uniqueSurnames[sName]) {
				// 	uniqueSurnames[sName] += 1;
				// } else {
				// 	uniqueSurnames[sName] = 1;
				// }

				// Status counts
				// if (user.status === 'active') {
				// 	dashboardData.members.active += 1;
				// } else if (user.status === 'dead') {
				// 	dashboardData.members.deceased += 1;
				// } else if (user.status === 'cancelled') {
				// 	dashboardData.members.cancelled += 1;
				// } else if (user.status === 'inactive') {
				// 	dashboardData.members.inactive += 1;
				// }

				if (user.gender === 'male') {
					dashboardData.demographics.male += 1;
				} else if (user.status === 'female') {
					dashboardData.demographics.female += 1;
				} else {
					dashboardData.demographics.other += 1;
				}
			});

			// let surnameList = Object.keys(uniqueSurnames)
			// 	.map((s) => {
			// 		return { name: formatString(s, ['capitalize-first']), count: uniqueSurnames[s] };
			// 	})
			// 	.sort((a, b) => b.count - a.count)
			// 	.slice(0, 5);

			// Mock data
			dashboardData = {
				members: {
					total: res.totalUsers,
					active: res.totalActiveUsers,
					deceased: res.deceasedUsers,
					cancelled: 0,
					removed: res.removedUsers
				},
				financial: {
					totalCollected: res.totalAmountCollected,
					pending: res.totalAmountToCollect - res.totalAmountCollected,
					target: res.totalAmountToCollect
				},
				demographics: {
					male: dashboardData.demographics.male,
					female: dashboardData.demographics.female,
					other: dashboardData.demographics.other,
					topSurnames: res.surnames,
					topDistricts: [
						{ name: 'Ahmedabad', count: 320 },
						{ name: 'Surat', count: 280 },
						{ name: 'Vadodara', count: 210 },
						{ name: 'Rajkot', count: 180 },
						{ name: 'Bhavnagar', count: 145 }
					]
				},
				outstanding: {
					highest: res.outstanding.highest,
					lowest: res.outstanding.lowest
				}
			};

			isLoading = false;
		} catch (error) {
			console.error('Failed to fetch dashboard data:', error);
			isLoading = false;
		}
	});

	// Navigate to members page with filter
	function navigateToMembers(filter?: string) {
		if (filter) {
			goto(`/members?filter=${filter}`);
		} else {
			goto('/members');
		}
	}

	// Format currency
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			maximumFractionDigits: 0
		}).format(amount);
	}

	// Calculate percentage
	function calculatePercentage(value: number, total: number): number {
		return total > 0 ? Math.round((value / total) * 100) : 0;
	}

	// Financial progress percentage
	const collectionProgress = $derived(
		calculatePercentage(dashboardData.financial.totalCollected, dashboardData.financial.target)
	);
</script>

{#if isLoading}
	<div class="flex min-h-[60vh] items-center justify-center">
		<div class="text-center">
			<div
				class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
			></div>
			<p class="mt-4 text-gray-600">Loading dashboard...</p>
		</div>
	</div>
{:else}
	<div class="space-y-6">
		<!-- Header -->
		<!-- <div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
			<p class="mt-1 text-gray-600">Overview of your organization</p>
		</div> -->

		<!-- Member Statistics -->
		<div>
			<h2 class="mb-4 text-lg font-semibold text-gray-900">Member Statistics</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
				<!-- Total Members -->
				<button
					type="button"
					onclick={() => navigateToMembers()}
					class="group rounded-xl border border-gray-200 bg-white p-6 text-left transition-shadow hover:shadow-lg"
				>
					<div class="mb-4 flex items-center justify-between">
						<div class="rounded-lg bg-blue-100 p-3 transition-colors group-hover:bg-blue-200">
							<Users class="h-6 w-6 text-blue-600" />
						</div>
					</div>
					<p class="mb-1 text-sm font-medium text-gray-600">Total Members</p>
					<p class="text-3xl font-bold text-gray-900">
						{dashboardData.members.total.toLocaleString()}
					</p>
				</button>

				<!-- Active Members -->
				<button
					type="button"
					onclick={() => navigateToMembers('active')}
					class="group rounded-xl border border-gray-200 bg-white p-6 text-left transition-shadow hover:shadow-lg"
				>
					<div class="mb-4 flex items-center justify-between">
						<div class="rounded-lg bg-green-100 p-3 transition-colors group-hover:bg-green-200">
							<UserCheck class="h-6 w-6 text-green-600" />
						</div>
					</div>
					<p class="mb-1 text-sm font-medium text-gray-600">Active</p>
					<p class="text-3xl font-bold text-gray-900">
						{dashboardData.members.active.toLocaleString()}
					</p>
					<p class="mt-2 text-xs text-green-600">
						{calculatePercentage(dashboardData.members.active, dashboardData.members.total)}% of
						total
					</p>
				</button>

				<!-- Deceased Members -->
				<button
					type="button"
					onclick={() => navigateToMembers('dead')}
					class="group rounded-xl border border-gray-200 bg-white p-6 text-left transition-shadow hover:shadow-lg"
				>
					<div class="mb-4 flex items-center justify-between">
						<div class="rounded-lg bg-red-100 p-3 transition-colors group-hover:bg-red-200">
							<UserX class="h-6 w-6 text-red-600" />
						</div>
					</div>
					<p class="mb-1 text-sm font-medium text-gray-600">Deceased</p>
					<p class="text-3xl font-bold text-gray-900">
						{dashboardData.members.deceased.toLocaleString()}
					</p>
				</button>

				<!-- Cancelled Members -->
				<button
					type="button"
					onclick={() => navigateToMembers('retired')}
					class="group rounded-xl border border-gray-200 bg-white p-6 text-left transition-shadow hover:shadow-lg"
				>
					<div class="mb-4 flex items-center justify-between">
						<div class="rounded-lg bg-orange-100 p-3 transition-colors group-hover:bg-orange-200">
							<UserMinus class="h-6 w-6 text-orange-600" />
						</div>
					</div>
					<p class="mb-1 text-sm font-medium text-gray-600">Voluntary Retired</p>
					<p class="text-3xl font-bold text-gray-900">
						{dashboardData.members.cancelled.toLocaleString()}
					</p>
				</button>

				<!-- Inactive Members -->
				<button
					type="button"
					onclick={() => navigateToMembers('removed')}
					class="group rounded-xl border border-gray-200 bg-white p-6 text-left transition-shadow hover:shadow-lg"
				>
					<div class="mb-4 flex items-center justify-between">
						<div class="rounded-lg bg-gray-100 p-3 transition-colors group-hover:bg-gray-200">
							<UserCircle class="h-6 w-6 text-gray-600" />
						</div>
					</div>
					<p class="mb-1 text-sm font-medium text-gray-600">Removed</p>
					<p class="text-3xl font-bold text-gray-900">
						{dashboardData.members.removed.toLocaleString()}
					</p>
				</button>
			</div>
		</div>

		<!-- Financial Overview -->
		<div>
			<h2 class="mb-4 text-lg font-semibold text-gray-900">Financial Overview</h2>
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<!-- Total Collected -->
				<div class="rounded-xl border border-gray-200 bg-white p-6">
					<div class="mb-4 flex items-center justify-between">
						<div class="rounded-lg bg-green-100 p-3">
							<IndianRupee class="h-6 w-6 text-green-600" />
						</div>
					</div>
					<p class="mb-1 text-sm font-medium text-gray-600">Total Collected</p>
					<p class="text-3xl font-bold text-gray-900">
						{formatCurrency(dashboardData.financial.totalCollected)}
					</p>
					<p class="mt-2 text-xs text-gray-500">Till date</p>
				</div>

				<!-- Pending Amount -->
				<div class="rounded-xl border border-gray-200 bg-white p-6">
					<div class="mb-4 flex items-center justify-between">
						<div class="rounded-lg bg-orange-100 p-3">
							<TriangleAlert class="h-6 w-6 text-orange-600" />
						</div>
					</div>
					<p class="mb-1 text-sm font-medium text-gray-600">Pending Collection</p>
					<p class="text-3xl font-bold text-gray-900">
						{formatCurrency(dashboardData.financial.pending)}
					</p>
					<p class="mt-2 text-xs text-gray-500">Remaining to collect</p>
				</div>

				<!-- Collection Progress -->
				<div class="rounded-xl border border-gray-200 bg-white p-6">
					<p class="mb-4 text-sm font-medium text-gray-600">Collection Progress</p>
					<div class="mb-4">
						<div class="mb-2 flex items-center justify-between">
							<span class="text-2xl font-bold text-gray-900">{collectionProgress}%</span>
							<span class="text-sm text-gray-600"
								>of {formatCurrency(dashboardData.financial.target)}</span
							>
						</div>
						<div class="h-3 w-full rounded-full bg-gray-200">
							<div
								class="h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
								style="width: {collectionProgress}%"
							></div>
						</div>
					</div>
					<p class="text-xs text-gray-500">Target achievement</p>
				</div>
			</div>
		</div>

		<!-- Demographics -->
		<div>
			<h2 class="mb-4 text-lg font-semibold text-gray-900">Demographics</h2>
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<!-- Most Outstanding -->
				<div class="rounded-xl border border-gray-200 bg-white p-6">
					<div class="mb-4 flex items-center gap-2">
						<OctagonX class="h-5 w-5 text-red-600" />
						<h3 class="text-sm font-semibold text-gray-900">Most Outstanding</h3>
					</div>
					<div class="space-y-3">
						{#each dashboardData.outstanding.highest as user, index}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<span
										class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600"
									>
										{index + 1}
									</span>
									<a
										href={`/members/view/${user._id}`}
										class="cursor-pointer text-sm font-medium text-gray-900">{user.full_name}</a
									>
								</div>
								<span class="text-sm font-bold text-red-600">{user.outstanding_amount}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Advance Payment -->
				<div class="rounded-xl border border-gray-200 bg-white p-6">
					<div class="mb-4 flex items-center gap-2">
						<SmilePlus class="h-5 w-5 text-green-600" />
						<h3 class="text-sm font-semibold text-gray-900">Advance Payment</h3>
					</div>
					<div class="space-y-3">
						{#each dashboardData.outstanding.lowest as user, index}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<span
										class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600"
									>
										{index + 1}
									</span>
									<a
										href={`/members/view/${user._id}`}
										class="cursor-pointer text-sm font-medium text-gray-900">{user.full_name}</a
									>
								</div>
								<span class="text-sm font-bold text-green-600"
									>{Math.abs(user.outstanding_amount)}</span
								>
							</div>
						{/each}
					</div>
				</div>

				<!-- Gender Distribution -->
				<!-- <div class="rounded-xl border border-gray-200 bg-white p-6">
					<h3 class="mb-4 text-sm font-semibold text-gray-900">Gender Distribution</h3>
					<div class="space-y-3">
						<div>
							<div class="mb-1 flex items-center justify-between">
								<span class="text-sm font-medium text-gray-600">Male</span>
								<span class="text-sm font-bold text-gray-900"
									>{dashboardData.demographics.male}</span
								>
							</div>
							<div class="h-2 w-full rounded-full bg-gray-200">
								<div
									class="h-2 rounded-full bg-blue-600"
									style="width: {calculatePercentage(
										dashboardData.demographics.male,
										dashboardData.members.total
									)}%"
								></div>
							</div>
						</div>

						<div>
							<div class="mb-1 flex items-center justify-between">
								<span class="text-sm font-medium text-gray-600">Female</span>
								<span class="text-sm font-bold text-gray-900"
									>{dashboardData.demographics.female}</span
								>
							</div>
							<div class="h-2 w-full rounded-full bg-gray-200">
								<div
									class="h-2 rounded-full bg-pink-600"
									style="width: {calculatePercentage(
										dashboardData.demographics.female,
										dashboardData.members.total
									)}%"
								></div>
							</div>
						</div>

						<div>
							<div class="mb-1 flex items-center justify-between">
								<span class="text-sm font-medium text-gray-600">Other</span>
								<span class="text-sm font-bold text-gray-900"
									>{dashboardData.demographics.other}</span
								>
							</div>
							<div class="h-2 w-full rounded-full bg-gray-200">
								<div
									class="h-2 rounded-full bg-purple-600"
									style="width: {calculatePercentage(
										dashboardData.demographics.other,
										dashboardData.members.total
									)}%"
								></div>
							</div>
						</div>
					</div>
				</div> -->

				<!-- Top Surnames -->
				<div class="rounded-xl border border-gray-200 bg-white p-6">
					<div class="mb-4 flex items-center gap-2">
						<Hash class="h-5 w-5 text-gray-600" />
						<h3 class="text-sm font-semibold text-gray-900">Top Surnames</h3>
					</div>
					<div class="space-y-3">
						{#each dashboardData.demographics.topSurnames as surname, index}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<span
										class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600"
									>
										{index + 1}
									</span>
									<span class="text-sm font-medium text-gray-900"
										>{formatString(surname.surname, ['capitalize-first'])}</span
									>
								</div>
								<span class="text-sm font-bold text-blue-600">{surname.count}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Top Districts -->
				<!-- <div class="rounded-xl border border-gray-200 bg-white p-6">
					<div class="mb-4 flex items-center gap-2">
						<MapPin class="h-5 w-5 text-gray-600" />
						<h3 class="text-sm font-semibold text-gray-900">Top Districts (Mock Data)</h3>
					</div>
					<div class="space-y-3">
						{#each dashboardData.demographics.topDistricts as district, index}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<span
										class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600"
									>
										{index + 1}
									</span>
									<span class="text-sm font-medium text-gray-900">{district.name}</span>
								</div>
								<span class="text-sm font-bold text-green-600">{district.count}</span>
							</div>
						{/each}
					</div>
				</div> -->
			</div>
		</div>
	</div>
{/if}
