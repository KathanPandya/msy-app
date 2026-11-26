<script lang="ts">
	type ButtonProps = {
		variant?: 'primary' | 'success' | 'secondary' | 'danger' | 'choice' | 'choiceSelected';
		size?: 'xs' | 'sm' | 'md';
		type?: 'button' | 'submit' | 'reset';
		onclick?: () => void;
		disabled?: boolean;
		children?: any;
	};

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		onclick,
		disabled = false,
		children
	}: ButtonProps = $props();

	const baseClasses =
		'rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

	// xs has a fixed height matching Input size="xs", so the two line up in a row.
	const sizeClasses = {
		xs: 'h-7 px-2.5 text-xs',
		sm: 'px-3 py-1.5 text-xs',
		md: 'px-4 py-2'
	};

	const variantClasses = {
		primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
		success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
		secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
		danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
		// Answer options (Yes/No), deliberately unlike action buttons.
		choice:
			'flex items-center gap-2 bg-white text-gray-700 border border-gray-300 hover:border-gray-400 focus:ring-blue-500',
		choiceSelected:
			'flex items-center gap-2 bg-blue-50 text-blue-800 border border-blue-600 focus:ring-blue-500'
	};
</script>

<button {type} {disabled} {onclick} class="{baseClasses} {sizeClasses[size]} {variantClasses[variant]}">
	{@render children?.()}
</button>
