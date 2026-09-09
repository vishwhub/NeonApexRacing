using Microsoft.Data.SqlClient;
using NeonApexRacing.Models;

namespace NeonApexRacing.Services;

public class LeaderboardService : ILeaderboardService
{
    private readonly string _connectionString;

    public LeaderboardService(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("GameDatabase")
            ?? throw new InvalidOperationException(
                "Connection string 'GameDatabase' was not found.");

        CreateScoresTableIfNeeded();
    }

    private void CreateScoresTableIfNeeded()
    {
        using var connection = new SqlConnection(_connectionString);
        connection.Open();

        string sql = """
            IF OBJECT_ID(N'dbo.Scores', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.Scores
                (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    PlayerName NVARCHAR(24) NOT NULL,
                    Points INT NOT NULL,
                    Distance INT NOT NULL,
                    AchievedAtUtc DATETIME2 NOT NULL
                );
            END
            """;

        using var command = new SqlCommand(sql, connection);
        command.ExecuteNonQuery();
    }

    public async Task<List<Score>> GetTopScoresAsync(int count = 10)
    {
        var scores = new List<Score>();

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        string sql = """
            SELECT TOP (@count)
                Id,
                PlayerName,
                Points,
                Distance,
                AchievedAtUtc
            FROM dbo.Scores
            ORDER BY Points DESC, Distance DESC, AchievedAtUtc ASC;
            """;

        await using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue("@count", Math.Clamp(count, 1, 10));

        await using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            scores.Add(new Score
            {
                Id = reader.GetInt32(0),
                PlayerName = reader.GetString(1),
                Points = reader.GetInt32(2),
                Distance = reader.GetInt32(3),
                AchievedAtUtc = reader.GetDateTime(4)
            });
        }

        return scores;
    }

    public async Task<Score> SaveScoreAsync(SaveScoreRequest request)
    {
        string playerName = string.IsNullOrWhiteSpace(request.PlayerName)
            ? "Driver"
            : request.PlayerName.Trim();

        if (playerName.Length > 24)
        {
            playerName = playerName[..24];
        }

        var score = new Score
        {
            PlayerName = playerName,
            Points = Math.Max(0, request.Points),
            Distance = Math.Max(0, request.Distance),
            AchievedAtUtc = DateTime.UtcNow
        };

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        string sql = """
            INSERT INTO dbo.Scores
                (PlayerName, Points, Distance, AchievedAtUtc)
            VALUES
                (@playerName, @points, @distance, @achievedAtUtc);

            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """;

        await using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue("@playerName", score.PlayerName);
        command.Parameters.AddWithValue("@points", score.Points);
        command.Parameters.AddWithValue("@distance", score.Distance);
        command.Parameters.AddWithValue("@achievedAtUtc", score.AchievedAtUtc);

        score.Id = Convert.ToInt32(await command.ExecuteScalarAsync());

        return score;
    }
}