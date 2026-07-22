export const useRelationshipStats = () => {
  const appConfig = useAppConfig()
  
  const daysTogether = computed(() => {
    const startDate = new Date(appConfig.datingStart)
    startDate.setHours(0, 0, 0, 0)
    
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    
    const differenceInMs = todayDate.getTime() - startDate.getTime()
    
    const msInOneDay = 1000 * 60 * 60 * 24
    return Math.floor(differenceInMs / msInOneDay)
  })
  
  return {
    daysTogether
  }
}