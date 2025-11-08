<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/authStore';
	import { requireAdmin } from '$lib/utilities/authGuard';
	import {
		ArrowDownRight,
		Bell,
		ChevronLeft,
		IndianRupee,
		LayoutDashboard,
		LogOut,
		Menu,
		Users
	} from '@lucide/svelte';

	let isSidebarOpen = $state(true);
	let isAuthorized = $state(false);

	$effect(() => {
		if (!$authStore.isLoading) {
			if (!$authStore.isAuthenticated) {
				goto('/admin');
			} else {
				// const isAdmin = $authStore.userAllInfo?.user?.role === 'admin';

				// if (!isAdmin) {
				// 	goto('/unauthorized');
				// } else {
				// 	isAuthorized = true;
				// }

				isAuthorized = requireAdmin();
			}
		}
	});

	function toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
	}

	function handleLogout() {
		// Add your logout logic here
		authStore.logout();
	}

	let currentUser = {
		name: `${$authStore.userAllInfo?.user?.first_name || 'Admin'}`,
		email: `${$authStore.userAllInfo?.user?.email || 'Email'}`
	};

	// Navigation items
	const navItems = [
		{ href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
		{ href: '/members', icon: Users, label: 'Members' },
		{ href: '/payins', icon: IndianRupee, label: 'Payins' },
		{ href: '/payouts', icon: ArrowDownRight, label: 'Payouts' }
	];

	const pageTitle = $derived.by(() => {
		// First try exact match
		const exactMatch = navItems.find((item) => item.href === page.url.pathname);
		if (exactMatch) return exactMatch.label;

		// Then try partial match (for sub-routes like /members/update/123)
		const partialMatch = navItems.find((item) => page.url.pathname.startsWith(item.href + '/'));
		if (partialMatch) return partialMatch.label;

		// Default fallback
		return 'MSY Admin';
	});

	// Check if route is active
	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	let { children } = $props();
</script>

{#if $authStore.isLoading}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="text-center">
			<div
				class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
			></div>
			<p class="mt-4 text-gray-600">Checking permissions...</p>
		</div>
	</div>
{:else if isAuthorized}
	<div class="flex h-screen w-screen overflow-hidden bg-white text-white">
		<!-- Sidebar -->
		<aside
			class={`
    ${isSidebarOpen ? 'w-64' : 'w-16'}
    flex flex-col border-r border-gray-200 bg-white transition-all duration-300
  `}
		>
			<!-- Sidebar Header -->
			<div class="flex items-center justify-between border-b border-gray-200 px-4 py-4">
				<span
					class={`
        ${isSidebarOpen ? 'opacity-100' : 'w-0 opacity-0'} 
        text-lg font-semibold text-gray-900 transition-opacity duration-300
      `}
				>
					{isSidebarOpen ? 'MSY Admin' : ''}
				</span>
				<button
					type="button"
					onclick={toggleSidebar}
					class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
				>
					{#if isSidebarOpen}
						<ChevronLeft size={20} />
					{:else}
						<Menu size={20} />
					{/if}
				</button>
			</div>

			<!-- Sidebar Navigation -->
			<nav class="flex-1 space-y-1 px-3 py-4">
				{#each navItems as item}
					{@const active = isActive(item.href)}
					<!-- {@const active = false} -->

					<a
						href={item.href}
						class={`
          flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors
          ${
						active
							? 'bg-blue-50 text-blue-600'
							: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
					}
          ${!isSidebarOpen ? 'justify-center' : ''}
        `}
						aria-current={active ? 'page' : undefined}
					>
						<item.icon size={20} class="flex-shrink-0" />
						{#if isSidebarOpen}
							<span class="ml-3">{item.label}</span>
						{/if}
					</a>
				{/each}
			</nav>

			<!-- Sidebar Footer (Optional) -->
			<!-- <div class="border-t border-gray-200 p-4">
				<div class={`flex items-center ${!isSidebarOpen ? 'justify-center' : ''}`}>
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white"
					>
						A
					</div>
					{#if isSidebarOpen}
						<div class="ml-3">
							<p class="text-sm font-medium text-gray-900">Admin</p>
							<p class="text-xs text-gray-500">admin@msy.com</p>
						</div>
					{/if}
				</div>
			</div> -->
		</aside>

		<!-- Main Section -->
		<div class="flex flex-1 flex-col overflow-hidden">
			<!-- Header (Fixed) -->
			<header
				class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm"
			>
				<!-- Left: Page Title or Breadcrumb -->

				<div class="flex items-center space-x-3">
					<h1 class="text-lg font-semibold text-gray-900">{pageTitle}</h1>
				</div>

				<!-- Right: User Actions -->
				<div class="flex items-center space-x-3">
					<!-- Notifications (Optional) -->
					<button
						type="button"
						class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
						aria-label="Notifications"
					>
						<Bell size={20} />
					</button>

					<!-- User Menu -->
					<div class="flex items-center space-x-3 border-l border-gray-200 pl-3">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white"
						>
							{currentUser.name.charAt(0)}
						</div>
						<div class="hidden md:block">
							<p class="text-sm font-medium text-gray-900">{currentUser.name}</p>
							<p class="text-xs text-gray-500">{currentUser.email}</p>
						</div>
					</div>

					<!-- Logout Button -->
					<button
						type="button"
						onclick={handleLogout}
						class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600 focus:ring-2 focus:ring-red-500 focus:outline-none"
						aria-label="Logout"
						title="Logout"
					>
						<LogOut size={20} />
					</button>
				</div>
			</header>

			<!-- Content (Scrollable) -->
			<main class="flex-1 overflow-y-auto bg-gray-50">
				<div class="h-full overflow-y-auto p-6">
					<!-- Add this wrapper -->
					{@render children?.()}
				</div>
			</main>
		</div>
	</div>
{/if}

<style>
	/* Smooth transitions */
	aside {
		will-change: width;
	}
</style>
