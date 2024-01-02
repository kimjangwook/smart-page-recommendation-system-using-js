<script lang="ts">
	import type { PageData, ActionData } from './$types';
	
	export let data: PageData;
	export let form: ActionData;
  
  let domain: string = 'https://blog.jangwook.net';
</script>

<main>
  <h1>Smart Page Recommendation System Using JS</h1>
  <form method="POST">
      <input type="text" bind:value={domain} name="domain" />
      <button type="submit" formaction="?/fetch">Fetch</button>
      <button type="submit" formaction="?/analyze">Analyze</button>
      <button type="submit" formaction="?/fetch_from_local">Fetch From Local</button>
      <button type="submit" formaction="?/analyze_from_local">Analyze From Local</button>
  </form>
  
  {#if form}
    {#if form.pageInfo}
      <h2>Page Info</h2>
      <table>
        <tr>
          <th>#</th>
          <th>URL</th>
          <th>Keywords</th>
        </tr>
        
        {#each form.pageInfo as item, i}
          <tr>
            <td>{i + 1}</td>
            <td>{item.url}</td>
            <td>{JSON.stringify(item.keywords)}</td>
          </tr>
        {/each}
      </table>
    {/if}
        
    {#if form.userData}
      <h2>User userData</h2>
      
      <table>
        <tr>
          <th>#</th>
          <th>Username</th>
          <th>Keyword</th>
          <th>Count</th>
          <th>Relatives</th>
          <th>Recommendation</th>
        </tr>
        {#each form.userData as item, i}
          {#each item.interests as interests, j}
            <tr>
              {#if j === 0}
                <td rowspan={item.interests.length}>{i + 1}</td>
                <td rowspan={item.interests.length}>{item.username}</td>
              {/if}
              <td>
                {interests.keyword}
              </td>
              <td>
                {interests.count}
              </td>
              <td>
                {#if interests.relatives}
                  <ul>
                    {#each interests.relatives as relative}
                      <li>{relative}</li>
                    {/each}
                  </ul>
                {/if}
              </td>
              
              {#if j === 0}
                <td rowspan={item.interests.length}>
                  {#if item.recommendations}
                    <ul>
                      {#each item.recommendations as recommendation}
                        <li>{recommendation.page} - {recommendation.score}</li>
                      {/each}
                    </ul>
                  {/if}
                </td>
              {/if}
            </tr>
          {/each}
        {/each}
      </table>
    {/if}
  {/if}
</main>


  