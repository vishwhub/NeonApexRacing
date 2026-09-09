using Microsoft.AspNetCore.Mvc;
using NeonApexRacing.Models;
using NeonApexRacing.Services;

namespace NeonApexRacing.Controllers;

public class GameController : Controller
{
    private readonly ILeaderboardService _leaderboardService;

    public GameController(ILeaderboardService leaderboardService)
    {
        _leaderboardService = leaderboardService;
    }

    // Opens the playable racing game page.
    public IActionResult Index()
    {
        return View();
    }

    // Opens the normal MVC leaderboard page.
    [HttpGet("/leaderboard")]
    public async Task<IActionResult> Leaderboard()
    {
        var scores = await _leaderboardService.GetTopScoresAsync();
        return View(scores);
    }

    // AJAX GET: /api/leaderboard
    [HttpGet("/api/leaderboard")]
    public async Task<IActionResult> GetLeaderboard()
    {
        var scores = await _leaderboardService.GetTopScoresAsync();
        return Ok(scores);
    }

    // AJAX POST: /api/leaderboard
    [HttpPost("/api/leaderboard")]
    public async Task<IActionResult> SaveScore([FromBody] SaveScoreRequest request)
    {
        if (request == null || request.Points < 0 || request.Distance < 0)
        {
            return BadRequest(new { message = "Invalid score data." });
        }

        var savedScore = await _leaderboardService.SaveScoreAsync(request);

        return Ok(new
        {
            message = "Score saved successfully.",
            score = savedScore
        });
    }
}