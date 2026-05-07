export const cloudSync = {
  getTeamId: () => {
    return localStorage.getItem('dispatcher_team_id');
  },
  
  setTeamId: (id: string) => {
    localStorage.setItem('dispatcher_team_id', id);
  },
  
  subscribe: (teamId: string) => {
    console.log(`Subscribed to team: ${teamId}`);
    // Mock implementation
    return () => console.log('Unsubscribed');
  },
  
  unsubscribe: () => {
    console.log('Unsubscribed from all');
  },
  
  pushData: async (teamId: string, data: Record<string, unknown>) => {
    console.log(`Pushing data to team: ${teamId}`, data);
    // Mock implementation
    return true;
  }
};
