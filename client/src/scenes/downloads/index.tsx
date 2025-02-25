import { gql } from '../../__generated__'
import { useSubscription } from '@apollo/client'

const Downloads = () => {
  const { loading: groupAddedLoading, error: groupAddedError, data: groupAddedData } = useSubscription(groupAddedSubscription)
  const { loading: groupStateLoading, error: groupStateError, data: groupStateData } = useSubscription(groupStateChangedSubscription)
  const { loading: groupStatusLoading, error: groupStatusError, data: groupStatusData } = useSubscription(groupStatusChangedSubscription)
  const { loading: itemStatsLoading, error: itemStatsError, data: itemStatsData } = useSubscription(itemStatsUpdatedSubscription)
  const { loading: itemStatusLoading, error: itemStatusError, data: itemStatusData } = useSubscription(itemStatusChangedSubscription)

  return (
    <div>
      <div>Downloads</div>
      <div style={ { borderBottom: '1px solid red' } }>
        <div style={ { fontSize: '22px', color: 'pink'} }>GroupAdded</div>
        <p>Loading { groupAddedLoading ? 'Yes' : 'Np' }</p>
        <p>Error { groupAddedError?.message || '-' }</p>
        <pre>Data: { JSON.stringify(groupAddedData, null, 2) }</pre>
      </div>
      <div style={ { borderBottom: '1px solid red' } }>
        <div style={ { fontSize: '22px', color: 'pink'} }>GroupStateChanged</div>
        <p>Loading { groupStateLoading ? 'Yes' : 'No' }</p>
        <p>Error { groupStateError?.message || '-' }</p>
        <pre>Data: { JSON.stringify(groupStateData, null, 2) }</pre>
      </div>
      <div style={ { borderBottom: '1px solid red' } }>
        <div style={ { fontSize: '22px', color: 'pink'} }>GroupStatusChanged</div>
        <p>Loading { groupStatusLoading ? 'Yes' : 'No' }</p>
        <p>Error { groupStatusError?.message || '-' }</p>
        <pre>Data: { JSON.stringify(groupStatusData, null, 2) }</pre>
      </div>
      <div style={ { borderBottom: '1px solid red' } }>
        <div style={ { fontSize: '22px', color: 'pink'} }>ItemStatsUpdated</div>
        <p>Loading { itemStatsLoading ? 'Yes' : 'No' }</p>
        <p>Error { itemStatsError?.message || '-' }</p>
        <pre>Data: { JSON.stringify(itemStatsData, null, 2) }</pre>
      </div>
      <div style={ { borderBottom: '1px solid red' } }>
        <div style={ { fontSize: '22px', color: 'pink'} }>ItemStatusChanged</div>
        <p>Loading { itemStatusLoading ? 'Yes' : 'No' }</p>
        <p>Error { itemStatusError?.message || '-' }</p>
        <pre>Data: { JSON.stringify(itemStatusData, null, 2) }</pre>
      </div>
    </div>
  )
}

export default Downloads


const groupAddedSubscription = gql(/* GraphQL */`
    subscription GroupAdded {
        groupAdded {
            addedAt
            id
            items {
                name
                size
                status
            }
            name
            saveAt
            state
            status
        }
    }
`)

const groupStateChangedSubscription = gql(/* GraphQL */`
    subscription GroupStateChanged {
        groupStateChanged {
            id
            state
        }
    }
`)

const groupStatusChangedSubscription = gql(/* GraphQL */`
    subscription GroupStatusChanged {
        groupStatusChanged {
            id
            status
        }
    }
`)

const itemStatsUpdatedSubscription = gql(/* GraphQL */`
    subscription ItemStatsUpdated {
        itemStatsUpdated {
            downloadedBytes
            itemId
            restartedAt
            speed
            startedAt
        }
    }
`)

const itemStatusChangedSubscription = gql(/* GraphQL */`
    subscription ItemStatusChanged {
        itemStatusChanged {
            status
            id
        }
    }
`)
