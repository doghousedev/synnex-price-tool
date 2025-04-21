<script lang="ts">
	import { onMount } from 'svelte';

	let connectionStatus = 'Testing connection...';
	let isConnected = false;
	let totalRows = 0;
	let searchTerm = '';
	let searchType = 'part';
	let orderBy = '';
	let orderDir: 'asc' | 'desc' = 'asc';
	let searchResults = [];
	let isLoading = false;
	let errorMessage = '';
	let showConfirmDialog = false;
	let pendingResults = [];

	/**
	 * Format a value as currency with 2 decimal places
	 * @param value The value to format
	 * @returns Formatted currency string or 'N/A' if invalid
	 */
	function formatCurrency(value: any): string {
		if (value === null || value === undefined) return 'N/A';
		
		try {
			// Convert to number if it's a string
			const numValue = typeof value === 'string' ? parseFloat(value) : value;
			
			// Check if it's a valid number after conversion
			if (isNaN(numValue)) return 'N/A';
			
			return numValue.toFixed(2);
		} catch (error) {
			console.error('Error formatting currency value:', value, error);
			return 'N/A';
		}
	}

	/**
	 * Format a numeric value
	 * @param value The value to format
	 * @returns Formatted number or 0 if invalid
	 */
	function formatNumber(value: any): number | string {
		if (value === null || value === undefined) return 0;
		
		try {
			// Convert to number if it's a string
			const numValue = typeof value === 'string' ? parseFloat(value) : value;
			
			// Check if it's a valid number after conversion
			if (isNaN(numValue)) return 0;
			
			return numValue;
		} catch (error) {
			console.error('Error formatting numeric value:', value, error);
			return 0;
		}
	}

	onMount(async () => {
		try {
			console.log('Testing database connection...');
			const response = await fetch('/api/test-connection');
			
			// Check if the response is OK (status in the range 200-299)
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			
			const data = await response.json();
			console.log('Connection test response:', data);
			
			if (data.success) {
				connectionStatus = 'Connected to database';
				isConnected = true;
				totalRows = data.data.total_rows;
				console.log(`Successfully connected to database. Found ${totalRows} records.`);
			} else {
				connectionStatus = `Connection failed: ${data.message}`;
				isConnected = false;
				console.error('Connection failed:', data.error);
			}
		} catch (error) {
			console.error('Error testing database connection:', error);
			connectionStatus = `Error: ${error instanceof Error ? error.message : String(error)}`;
			isConnected = false;
		}
	});

	async function handleSearch() {
	if (!searchTerm.trim()) {
		errorMessage = 'Please enter a search term';
		return;
	}

	errorMessage = '';
	isLoading = true;
	searchResults = [];

	try {
		console.log(`Searching for ${searchType}: ${searchTerm}`);
		const params = new URLSearchParams({
			type: searchType,
			term: searchTerm,
		});
		if (orderBy) params.set('orderBy', orderBy);
		if (orderDir) params.set('orderDir', orderDir);
		const response = await fetch(`/api/search?${params.toString()}`);

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const data = await response.json();
		console.log('Search response:', data);

		if (data.success) {
			if (data.results.length > 250) {
				pendingResults = data.results;
				showConfirmDialog = true;
			} else {
				searchResults = data.results;
			}
			if (data.results.length === 0) {
				errorMessage = 'No results found';
			}
		} else {
			errorMessage = data.message || 'Search failed';
			console.error('Search failed:', data.error);
		}
	} catch (error) {
		console.error('Error during search:', error);
		errorMessage = `Error: ${error instanceof Error ? error.message : String(error)}`;
	}

	isLoading = false;
}

function confirmShowAll() {
	searchResults = pendingResults;
	showConfirmDialog = false;
	pendingResults = [];
}

function cancelShowAll() {
	showConfirmDialog = false;
	pendingResults = [];
	// Optionally show a message or keep searchResults empty
}

</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Synnex Price Tool" />
</svelte:head>

<main>
	<section>
		<h1>Synnex-Pricebook Tool</h1>
		<p>This is a demo of the Synnex Price Tool.</p>
		
		<div class="connection-status">
			<p class={isConnected ? 'connected' : 'disconnected'}>
				{connectionStatus}
				{#if isConnected}
					<span>({totalRows.toLocaleString()} records found)</span>
				{/if}
			</p>
		</div>

		{#if isConnected}
			<div class="search-container">
				<h2>Search Synnex Products</h2>
				
				<div class="search-controls">
					<div class="search-type">
						<label>
							<input type="radio" bind:group={searchType} value="part" />
							Part Number
						</label>
						<label>
							<input type="radio" bind:group={searchType} value="description" />
							Description
						</label>
						<label>
							<input type="radio" bind:group={searchType} value="sku" />
							Synnex SKU
						</label>
						<label>
							<input type="radio" bind:group={searchType} value="manufacturer" />
							Manufacturer
						</label>
					</div>
					
					<div class="search-input">
						<input 
							type="text" 
							bind:value={searchTerm} 
							placeholder="Enter search term..." 
							on:keydown={(e) => e.key === 'Enter' && handleSearch()}
						/>
						<select bind:value={orderBy}>
							<option value="">Sort By (default)</option>
							<option value="manufacturer_part_no">Part Number</option>
							<option value="part_description">Description</option>
							<option value="td_synnex_sku">Synnex SKU</option>
							<option value="manufacturer_name">Manufacturer</option>
						</select>
						<select bind:value={orderDir}>
							<option value="asc">Ascending</option>
							<option value="desc">Descending</option>
						</select>
						<button on:click={handleSearch} disabled={isLoading}>
							{isLoading ? 'Searching...' : 'Search'}
						</button>
					</div>
				</div>

				{#if errorMessage}
					<p class="error-message">{errorMessage}</p>
				{/if}

				{#if showConfirmDialog}
				<div class="modal-overlay">
					<div class="modal">
						<p>More than 250 results were found. Displaying all records may impact performance. Do you want to proceed and show all {pendingResults.length} results?</p>
						<div class="modal-actions">
							<button on:click={confirmShowAll}>Yes, show all</button>
							<button on:click={cancelShowAll}>Cancel</button>
						</div>
					</div>
				</div>
			{/if}
			{#if searchResults.length > 0}
				<div class="results-container">
					<h3>Results ({searchResults.length})</h3>
					<table>
						<thead>
							<tr>
								<th>Synnex SKU</th>
								<th>Manufacturer</th>
								<th>Part Number</th>
								<th>Description</th>
								<th>Unit Cost</th>
								<th>MSRP</th>
								<th>Stock</th>
							</tr>
						</thead>
						<tbody>
							{#each searchResults as product}
								<tr>
									<td>{product.td_synnex_sku}</td>
									<td>{product.manufacturer_name || 'N/A'}</td>
									<td>{product.manufacturer_part_no || 'N/A'}</td>
									<td>{product.part_description || 'N/A'}</td>
									<td>${formatCurrency(product.unit_cost)}</td>
									<td>${formatCurrency(product.msrp)}</td>
									<td>{formatNumber(product.qty_on_hand_total) || 0}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
			</div>
		{/if}
	</section>
</main>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}

	h1 {
		width: 100%;
		text-align: center;
		margin-bottom: 1rem;
	}

	.connection-status {
		margin: 1rem 0;
		width: 100%;
		text-align: center;
	}

	.connected {
		color: green;
		font-weight: bold;
	}

	.disconnected {
		color: red;
		font-weight: bold;
	}

	.search-container {
		width: 100%;
		margin-top: 2rem;
	}

	.search-container h2 {
		text-align: center;
		margin-bottom: 1rem;
	}

	.search-controls {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.search-type {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
	}

	.search-input {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}

	.search-input input {
		width: 60%;
		max-width: 500px;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.search-input button {
		padding: 0.5rem 1rem;
		background-color: #4a86e8;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.search-input button:hover {
		background-color: #3a76d8;
	}

	.search-input button:disabled {
		background-color: #cccccc;
		cursor: not-allowed;
	}

	.error-message {
		color: red;
		text-align: center;
		margin: 1rem 0;
	}

	.results-container {
		width: 100%;
		overflow-x: auto;
		margin-top: 1rem;
	}

	.results-container h3 {
		margin-bottom: 0.5rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 0.5rem;
	}

	th, td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid #ddd;
	}

	th {
		background-color: #f2f2f2;
		font-weight: bold;
	}

	tr:hover {
		background-color: #f5f5f5;
	}
</style>
