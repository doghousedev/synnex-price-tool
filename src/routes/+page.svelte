<script lang="ts">
	import { onMount } from 'svelte';

	let connectionStatus = 'Testing connection...';
	let isConnected = false;
	let totalRows = 0;
	let searchTerm = '';
	let searchType = 'part';
	let searchResults = [];
	let isLoading = false;
	let errorMessage = '';

	onMount(async () => {
		try {
			const response = await fetch('/api/test-connection');
			const data = await response.json();
			
			if (data.success) {
				connectionStatus = 'Connected to database';
				isConnected = true;
				totalRows = data.data.total_rows;
			} else {
				connectionStatus = `Connection failed: ${data.message}`;
				isConnected = false;
			}
		} catch (error) {
			connectionStatus = `Error: ${error.message}`;
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
			const response = await fetch(`/api/search?type=${searchType}&term=${encodeURIComponent(searchTerm)}`);
			const data = await response.json();
			
			if (data.success) {
				searchResults = data.results;
				if (searchResults.length === 0) {
					errorMessage = 'No results found';
				}
			} else {
				errorMessage = data.message || 'Search failed';
			}
		} catch (error) {
			errorMessage = `Error: ${error.message}`;
		}

		isLoading = false;
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
					</div>
					
					<div class="search-input">
						<input 
							type="text" 
							bind:value={searchTerm} 
							placeholder="Enter search term..." 
							on:keydown={(e) => e.key === 'Enter' && handleSearch()}
						/>
						<button on:click={handleSearch} disabled={isLoading}>
							{isLoading ? 'Searching...' : 'Search'}
						</button>
					</div>
				</div>

				{#if errorMessage}
					<p class="error-message">{errorMessage}</p>
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
										<td>{product.manufacturer_name}</td>
										<td>{product.manufacturer_part_no}</td>
										<td>{product.part_description}</td>
										<td>${product.unit_cost?.toFixed(2) || 'N/A'}</td>
										<td>${product.msrp?.toFixed(2) || 'N/A'}</td>
										<td>{product.qty_on_hand_total || 0}</td>
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
