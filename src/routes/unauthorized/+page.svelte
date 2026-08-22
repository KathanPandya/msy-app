<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="flex min-h-full flex-col items-center justify-center bg-gray-50 px-4">
	<div class="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
		<h1 class="text-2xl font-bold text-gray-900">Unauthorized</h1>
		<p class="mt-3 text-sm text-gray-600">You don't have permission to view this page.</p>
		<div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
			<button
				type="button"
				onclick={() => goto('/me')}
				class="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
			>
				Go to my page
			</button>
			<button
				type="button"
				onclick={() => goto('/admin')}
				class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
			>
				Admin login
			</button>
		</div>
	</div>
</div>
