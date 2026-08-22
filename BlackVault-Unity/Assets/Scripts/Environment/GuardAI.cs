using UnityEngine;
using UnityEngine.AI;

public class GuardAI : MonoBehaviour
{
    [Header("Patrol")]
    public Transform[] waypoints;
    public float patrolSpeed = 2f;
    public float waitTimeAtWaypoint = 1.5f;

    [Header("Chase")]
    public float chaseSpeed = 5f;
    public float catchDistance = 2f;
    public float losePlayerTime = 4f;

    [Header("Detection")]
    public float viewRadius = 10f;
    [Range(0, 360)]
    public float viewAngle = 90f;
    public float hearingRadius = 5f;
    public LayerMask targetMask;
    public LayerMask obstacleMask;

    [Header("Animation")]
    public Animator animator;

    private NavMeshAgent agent;
    private int currentWaypointIndex;
    private Transform playerTarget;
    private StealthController playerStealth;

    private enum GuardState { Patrol, Suspicious, Chase, ReturnToPatrol }
    private GuardState state = GuardState.Patrol;
    private float waitTimer;
    private float loseTimer;
    private Vector3 lastKnownPlayerPos;

    // Animation parameter hashes for performance
    private static readonly int SpeedHash = Animator.StringToHash("Speed");
    private static readonly int IsRunningHash = Animator.StringToHash("IsRunning");

    void Start()
    {
        agent = GetComponent<NavMeshAgent>();
        agent.speed = patrolSpeed;

        // Find player automatically
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player != null)
        {
            playerTarget = player.transform;
            playerStealth = player.GetComponent<StealthController>();
        }

        if (animator == null)
            animator = GetComponentInChildren<Animator>();

        if (waypoints.Length > 0)
        {
            agent.SetDestination(waypoints[0].position);
        }
    }

    void Update()
    {
        switch (state)
        {
            case GuardState.Patrol:
                Patrol();
                if (CanSeePlayer())
                {
                    state = GuardState.Chase;
                    loseTimer = losePlayerTime;
                }
                break;

            case GuardState.Chase:
                ChasePlayer();
                if (CanSeePlayer())
                {
                    loseTimer = losePlayerTime;
                    lastKnownPlayerPos = playerTarget.position;
                }
                else
                {
                    loseTimer -= Time.deltaTime;
                    if (loseTimer <= 0f)
                    {
                        state = GuardState.ReturnToPatrol;
                    }
                }
                break;

            case GuardState.ReturnToPatrol:
                agent.speed = patrolSpeed;
                if (waypoints.Length > 0)
                    agent.SetDestination(waypoints[currentWaypointIndex].position);
                state = GuardState.Patrol;
                break;
        }

        UpdateAnimator();
    }

    void Patrol()
    {
        agent.speed = patrolSpeed;
        if (waypoints.Length == 0) return;

        if (!agent.pathPending && agent.remainingDistance < 0.5f)
        {
            waitTimer += Time.deltaTime;
            if (waitTimer >= waitTimeAtWaypoint)
            {
                waitTimer = 0f;
                currentWaypointIndex = (currentWaypointIndex + 1) % waypoints.Length;
                agent.SetDestination(waypoints[currentWaypointIndex].position);
            }
        }
    }

    void ChasePlayer()
    {
        if (playerTarget == null) return;

        agent.speed = chaseSpeed;
        agent.SetDestination(playerTarget.position);

        if (Vector3.Distance(transform.position, playerTarget.position) < catchDistance)
        {
            Debug.Log("[BlackVault] Guard caught the player!");
            // TODO: Trigger game over / restart
        }
    }

    bool CanSeePlayer()
    {
        if (playerTarget == null) return false;

        // If player is hiding, they cannot be detected
        if (playerStealth != null && playerStealth.IsHidden)
            return false;

        Vector3 dirToPlayer = (playerTarget.position - transform.position).normalized;
        float distanceToPlayer = Vector3.Distance(transform.position, playerTarget.position);

        // Hearing check (omnidirectional, shorter range)
        if (distanceToPlayer < hearingRadius)
        {
            if (!Physics.Raycast(transform.position + Vector3.up, dirToPlayer, distanceToPlayer, obstacleMask))
                return true;
        }

        // Vision cone check
        if (distanceToPlayer < viewRadius)
        {
            if (Vector3.Angle(transform.forward, dirToPlayer) < viewAngle / 2f)
            {
                if (!Physics.Raycast(transform.position + Vector3.up, dirToPlayer, distanceToPlayer, obstacleMask))
                    return true;
            }
        }

        return false;
    }

    void UpdateAnimator()
    {
        if (animator == null) return;

        float speed = agent.velocity.magnitude;
        animator.SetFloat(SpeedHash, speed);
        animator.SetBool(IsRunningHash, state == GuardState.Chase);
    }

    // Draw FOV in the editor for easy debugging
    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, viewRadius);

        Gizmos.color = Color.cyan;
        Gizmos.DrawWireSphere(transform.position, hearingRadius);

        // Draw view cone
        Vector3 viewAngleLeft = DirFromAngle(-viewAngle / 2f, false);
        Vector3 viewAngleRight = DirFromAngle(viewAngle / 2f, false);

        Gizmos.color = Color.red;
        Gizmos.DrawLine(transform.position, transform.position + viewAngleLeft * viewRadius);
        Gizmos.DrawLine(transform.position, transform.position + viewAngleRight * viewRadius);
    }

    Vector3 DirFromAngle(float angleInDegrees, bool isGlobal)
    {
        if (!isGlobal)
            angleInDegrees += transform.eulerAngles.y;

        return new Vector3(
            Mathf.Sin(angleInDegrees * Mathf.Deg2Rad),
            0f,
            Mathf.Cos(angleInDegrees * Mathf.Deg2Rad)
        );
    }
}
