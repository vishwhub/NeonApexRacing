using NeonApexRacing.Models;

namespace NeonApexRacing.Services;

public interface ILeaderboardService
{
    Task<List<Score>> GetTopScoresAsync(int count = 10);

    Task<Score> SaveScoreAsync(SaveScoreRequest request);
}