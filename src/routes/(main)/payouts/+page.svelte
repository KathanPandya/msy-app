<script lang="ts">
	import { goto } from '$app/navigation';
	import axios from '$lib/config/axios';
	import { EllipsisVertical, Plus } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	const fetchMemberList = async (search?: boolean, query?: string) => {
		try {
			const response = await axios.get(
				'api/user',
				search
					? {
							params: {
								first_name: query
							}
						}
					: {}
			);
			userList.set(response.data.users);
			return response.data;
		} catch (error) {
			userList.set([]);
			console.error('Error while fetching user list', error);
		}
	};

	// let userList: any = $state();
	const userList = writable<any[]>([]);

	onMount(() => {
		fetchMemberList();
	});

	function goToUpdate(user: any) {
		goto('/members/update', { state: { user } });
	}
</script>

<!-- <div class="min-h-screen bg-gray-900 p-6"> -->
<div class="min-zh-screen text-black">
	{#if $userList.length}
		<div class="mb-4 flex items-center justify-between">
			<label class="input">
				<svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<g
						stroke-linejoin="round"
						stroke-linecap="round"
						stroke-width="2.5"
						fill="none"
						stroke="currentColor"
					>
						<circle cx="11" cy="11" r="8"></circle>
						<path d="m21 21-4.3-4.3"></path>
					</g>
				</svg>
				<input type="search" class="grow" placeholder="Search" />
			</label>

			<button class="btn btn-primary" on:click={() => goto('/members/create')}
				><Plus class="mr-2 h-4 w-4" />Add Payout</button
			>
		</div>

		<div class="overflow-x-auto">
			<table class="table rounded-box border border-base-content/5 table-zebra bg-base-100">
				<!-- head -->
				<thead>
					<tr>
						<th></th>
						<th>Name</th>
						<th>Mobile</th>
						<th>Email</th>
						<th>Gender</th>
					</tr>
				</thead>
				<tbody>
					{#each $userList as user, index}
						<tr>
							<th>
								<button popovertarget={'popover-' + index} style={'anchor-name: --anchor-' + index}>
									<EllipsisVertical class="h-4 w-4" />
								</button>

								<ul
									class="menu dropdown w-52 rounded-box bg-base-100 shadow-sm"
									popover
									id={'popover-' + index}
									style={'position-anchor: --anchor-' + index}
								>
									<li>
										<button on:click={() => goToUpdate($userList[index])}> Update </button>
									</li>
								</ul>
							</th>
							<td>{user.first_name} {user.last_name}</td>
							<td>{user.mobile}</td>
							<td>{user.email}</td>
							<td>{user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		Loading...
	{/if}
</div>
<!-- </div> -->
