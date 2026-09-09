using System.ComponentModel.DataAnnotations;

namespace NeonApexRacing.Models;

public class Score
{
    public int Id { get; set; }

    [Required]
    [StringLength(24)]
    public string PlayerName { get; set; } = "Driver";

    [Range(0, int.MaxValue)]
    public int Points { get; set; }

    [Range(0, int.MaxValue)]
    public int Distance { get; set; }

    public DateTime AchievedAtUtc { get; set; } = DateTime.UtcNow;
}

public class SaveScoreRequest
{
    public string? PlayerName { get; set; }

    public int Points { get; set; }

    public int Distance { get; set; }
}